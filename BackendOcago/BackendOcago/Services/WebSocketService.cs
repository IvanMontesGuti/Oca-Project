using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Collections.Concurrent;
using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using Microsoft.EntityFrameworkCore;
using BackendOcago.Models.Dtos;

namespace BackendOcago.Services;

public class WebSocketService
{
    private readonly DataContext _dbContext;
    private static readonly ConcurrentDictionary<long, WebSocket> _connections = new();

    public WebSocketService(DataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task HandleConnectionAsync(long userId, WebSocket webSocket)
    {
        _connections[userId] = webSocket;

        while (webSocket.State == WebSocketState.Open)
        {
            string message = await ReadMessageAsync(webSocket);
            if (!string.IsNullOrWhiteSpace(message))
            {
                await ProcessMessageAsync(userId, message);
            }
        }

        _connections.TryRemove(userId, out _);
    }

    private async Task ProcessMessageAsync(long senderId, string message)
    {
        var request = JsonSerializer.Deserialize<WebSocketRequest>(message);
        if (request == null || request.SenderId == request.ReceiverId) return;

        // Verificar si ya existe una solicitud de amistad
        var existingRequest = await _dbContext.Friendships
            .FirstOrDefaultAsync(f => f.SenderId == request.SenderId && f.ReceiverId == request.ReceiverId);

        if (existingRequest != null) return;

        // Crear nueva solicitud de amistad
        var friendship = new Friendship
        {
            SenderId = request.SenderId,
            ReceiverId = request.ReceiverId,
            SentAt = DateTime.UtcNow,
            Status = FriendshipInvitationStatus.Pendiente
        };

        _dbContext.Friendships.Add(friendship);
        await _dbContext.SaveChangesAsync();

        // Enviar notificación de solicitud de amistad al receptor
        var notification = JsonSerializer.Serialize(new
        {
            senderId = request.SenderId,
            receiverId = request.ReceiverId,
            sentAt = friendship.SentAt,
            status = friendship.Status.ToString(),
            message = "Tienes una solicitud de amistad pendiente. ¿Aceptar o rechazar?"
        });

        await SendMessageToClient(request.ReceiverId, notification);
    }



    private async Task<string> ReadMessageAsync(WebSocket webSocket)
    {
        var buffer = new byte[4096];
        var result = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

        return result.MessageType == WebSocketMessageType.Text
            ? Encoding.UTF8.GetString(buffer, 0, result.Count)
            : string.Empty;
    }

    public async Task SendMessageToClient(long userId, string message)
    {
        if (_connections.TryGetValue(userId, out var socket) && socket.State == WebSocketState.Open)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(message);
            await socket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
        else
        {
            Console.WriteLine($"El usuario {userId} no tiene una conexión WebSocket activa.");
        }
    }


}
