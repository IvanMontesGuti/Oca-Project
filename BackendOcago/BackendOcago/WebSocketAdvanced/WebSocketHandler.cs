using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BackendOcago.Models.Dtos;
using System.Collections.Concurrent;

namespace BackendOcago.WebSocketAdvanced;

public class WebSocketHandler : IDisposable
{
    private const int BUFFER_SIZE = 4096;
    private readonly WebSocket _webSocket;
    private readonly DataContext _dbContext;
    private readonly byte[] _buffer;
    private static readonly ConcurrentDictionary<long, WebSocket> _connections = new();  // Agregado para manejar las conexiones
    public long UserId { get; init; }
    public bool IsOpen => _webSocket.State == WebSocketState.Open;

    public event Func<WebSocketHandler, Friendship, Task> FriendshipRequestReceived;

    public WebSocketHandler(long userId, WebSocket webSocket, DataContext dbContext)
    {
        UserId = userId;
        _webSocket = webSocket;
        _dbContext = dbContext;
        _buffer = new byte[BUFFER_SIZE];
    }

    public async Task HandleAsync()
    {
        // Añadimos la conexión en _connections
        _connections[UserId] = _webSocket;

        while (IsOpen)
        {
            string message = await ReadAsync();
            if (!string.IsNullOrWhiteSpace(message))
            {
                try
                {
                    var request = JsonSerializer.Deserialize<WebSocketRequest>(message);
                    if (request != null && request.SenderId == UserId)
                    {
                        await HandleFriendRequest(request);
                    }
                }
                catch (JsonException ex)
                {
                    Console.WriteLine($"Error al deserializar JSON: {ex.Message}");
                }
            }
        }

        // Cuando la conexión se cierre, la removemos
        _connections.TryRemove(UserId, out _);
    }

    private async Task<string> ReadAsync()
    {
        using MemoryStream textStream = new();
        WebSocketReceiveResult receiveResult;

        do
        {
            receiveResult = await _webSocket.ReceiveAsync(_buffer, CancellationToken.None);
            if (receiveResult.MessageType == WebSocketMessageType.Text)
            {
                textStream.Write(_buffer, 0, receiveResult.Count);
            }
            else if (receiveResult.CloseStatus.HasValue)
            {
                await _webSocket.CloseAsync(receiveResult.CloseStatus.Value, receiveResult.CloseStatusDescription, CancellationToken.None);
            }
        }
        while (!receiveResult.EndOfMessage);

        return Encoding.UTF8.GetString(textStream.ToArray());
    }

    public async Task HandleFriendRequest(WebSocketRequest request)
    {
        if (request.SenderId == request.ReceiverId)
        {
            return;
        }

        var existingRequest = await _dbContext.Friendships
            .FirstOrDefaultAsync(f => f.SenderId == request.SenderId && f.ReceiverId == request.ReceiverId);

        if (existingRequest != null)
        {
            return;
        }

        var friendship = new Friendship
        {
            SenderId = request.SenderId,
            ReceiverId = request.ReceiverId,
            SentAt = DateTime.UtcNow,
            Status = FriendshipInvitationStatus.Pendiente
        };

        _dbContext.Friendships.Add(friendship);
        await _dbContext.SaveChangesAsync();

        await SendFriendRequestNotification(request.ReceiverId, friendship);
    }

    private async Task SendFriendRequestNotification(long receiverId, Friendship friendship)
    {
        if (_connections.TryGetValue(receiverId, out var receiverSocket) && receiverSocket.State == WebSocketState.Open)
        {
            var notification = JsonSerializer.Serialize(new
            {
                senderId = friendship.SenderId,
                receiverId,
                sentAt = friendship.SentAt,
                status = friendship.Status.ToString(),
                message = "Tienes una solicitud de amistad pendiente. ¿Aceptar o rechazar?"
            });

            byte[] bytes = Encoding.UTF8.GetBytes(notification);
            await receiverSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }


    public async Task SendAsync(string message)
    {
        if (IsOpen)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(message);
            await _webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    private async Task HandleResponseAsync(WebSocketRequest request)
    {
        var friendship = await _dbContext.Friendships
            .FirstOrDefaultAsync(f => f.SenderId == request.SenderId && f.ReceiverId == request.ReceiverId);

        if (friendship == null || friendship.Status != FriendshipInvitationStatus.Pendiente)
        {
            return;
        }

        friendship.Status = request.Response;
        await _dbContext.SaveChangesAsync();

        await SendResponseNotification(request.SenderId, friendship);
    }

    private async Task SendResponseNotification(long senderId, Friendship friendship)
    {
        if (_connections.TryGetValue(senderId, out var socket) && socket.State == WebSocketState.Open)
        {
            var notification = JsonSerializer.Serialize(new
            {
                senderId,
                receiverId = friendship.ReceiverId,
                status = friendship.Status.ToString()
            });

            await SendAsync(notification);
        }
    }

    public void Dispose()
    {
        _webSocket.Dispose();
    }
}
