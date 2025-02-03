using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text.Json;
using System.Text;

public class WebSocketHandler
{
    private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private static readonly object _lock = new();

    public WebSocketHandler(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory;
    }

    public async Task HandleConnection(WebSocket webSocket, string userId)
    {
        try
        {
            // Agregar usuario de forma segura
            lock (_lock)
            {
                _connections[userId] = webSocket;
            }

            int connectedCount = _connections.Count;

            // Enviar mensaje solo al usuario recién conectado
            await SendMessage(userId, new { Message = $"Hay {connectedCount} usuarios conectados." });

            // Notificar a todos los demás usuarios (excluyendo al usuario recién conectado)
            await BroadcastMessage(new { Message = $"Hay {connectedCount} usuarios conectados." }, excludeUserId: userId);

            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }
            }
        }
        finally
        {
            // Eliminar usuario de forma segura
            lock (_lock)
            {
                _connections.TryRemove(userId, out _);
            }

            int connectedCount = _connections.Count;

            // Notificar a todos los usuarios que alguien salió
            await BroadcastMessage(new { Message = $"Hay {connectedCount} usuarios conectados." });
        }
    }

    private async Task BroadcastMessage(object message, string excludeUserId = null)
    {
        var jsonMessage = JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(jsonMessage);

        List<Task> sendTasks = new();
        foreach (var (userId, connection) in _connections)
        {
            if (connection.State == WebSocketState.Open && userId != excludeUserId)
            {
                sendTasks.Add(connection.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None));
            }
        }

        await Task.WhenAll(sendTasks);
    }

    private async Task SendMessage(string receiverId, object message)
    {
        if (_connections.TryGetValue(receiverId, out var receiverSocket) && receiverSocket.State == WebSocketState.Open)
        {
            var jsonMessage = JsonSerializer.Serialize(message);
            var bytes = Encoding.UTF8.GetBytes(jsonMessage);
            await receiverSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}
