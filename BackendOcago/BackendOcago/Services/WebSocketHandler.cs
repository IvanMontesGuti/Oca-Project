using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Dtos;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;

public class WebSocketHandler
{
    private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly LobbyService _lobby; 
    private static readonly object _lock = new();

    public WebSocketHandler(IServiceScopeFactory serviceScopeFactory, LobbyService lobby)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _lobby = lobby;
    }

    public async Task HandleConnection(WebSocket webSocket, string userId)
    {
        try
        {
            // Agregar el usuario de forma segura
            lock (_lock)
            {
                _connections[userId] = webSocket;
            }

            // Al conectarse, el usuario se marca como Conectado.
            await _lobby.SetUserStatusAsync(userId, UserStatus.Conectado);

            int connectedCount = _connections.Count;
            await SendMessage(userId, new { Message = $"Hay {connectedCount} usuarios conectados." });
            await BroadcastMessage(new { Message = $"Hay {connectedCount} usuarios conectados." }, excludeUserId: userId);

            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                var messageString = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var wsMessage = JsonSerializer.Deserialize<WebSocketMessage>(messageString);
                if (wsMessage != null)
                {
                    // Asignamos el remitente basado en la conexión actual
                    wsMessage.SenderId = userId;
                    await ProcessMessage(wsMessage);
                }
            }
        }
        finally
        {
            lock (_lock)
            {
                _connections.TryRemove(userId, out _);
            }

            // Marcar al usuario como Desconectado en la base de datos y en memoria
            await _lobby.SetUserStatusAsync(userId, UserStatus.Desconectado);

            int connectedCount = _connections.Count;
            await BroadcastMessage(new { Message = $"Hay {connectedCount} usuarios conectados." });
        }

    }

    private async Task ProcessMessage(WebSocketMessage message)
    {
        switch (message.Type)
        {
            case "invite":
                // Validar que el usuario invitado esté Conectado antes de enviar la invitación
                if (_lobby.GetUserStatus(message.ReceiverId) == UserStatus.Conectado)
                {
                    await SendMessage(message.ReceiverId, message);
                }
                else
                {
                    // Notificar al remitente que el usuario no está disponible
                    await SendMessage(message.SenderId, new { Message = $"El usuario {message.ReceiverId} no está disponible para jugar." });
                }
                break;
            case "accept":
                await _lobby.SetUserStatusAsync(message.SenderId, UserStatus.Jugando);
                await _lobby.SetUserStatusAsync(message.ReceiverId, UserStatus.Jugando);
                await SendMessage(message.ReceiverId, message);
                break;
            case "reject":
                await SendMessage(message.ReceiverId, message);
                break;
            case "cancel":
                _lobby.RemoveFromRandomQueue(message.SenderId);
                await SendMessage(message.ReceiverId, message);
                break;
            case "startGame":
                await _lobby.SetUserStatusAsync(message.SenderId, UserStatus.Jugando);
                await _lobby.SetUserStatusAsync(message.ReceiverId, UserStatus.Jugando);
                await SendMessage(message.SenderId, message);
                await SendMessage(message.ReceiverId, message);
                break;
            case "random":
                var result = await _lobby.AddToRandomQueueAsync(message.SenderId);
                if (result.HasValue)
                {
                    if (result.Value.paired)
                    {
                        var opponentId = result.Value.opponent;
                        await SendMessage(message.SenderId, new { Message = "Emparejado", OpponentId = opponentId });
                        await SendMessage(opponentId, new { Message = "Emparejado", OpponentId = message.SenderId });
                    }
                    else
                    {
                        await SendMessage(message.SenderId, new { Message = "Buscando oponente..." });
                    }
                }
                break;
            case "cancelRandom":
                _lobby.RemoveFromRandomQueue(message.SenderId);
                await SendMessage(message.SenderId, new { Message = "Búsqueda cancelada." });
                break;
            case "playBot":
                await _lobby.StartBotGameAsync(message.SenderId);
                await SendMessage(message.SenderId, new { Message = "Iniciando partida contra bot." });
                break;
            default:
                break;
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
