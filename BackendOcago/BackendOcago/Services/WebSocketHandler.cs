using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Dtos;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using BackendOcago.Services;  // Se requiere para acceder a FriendshipService

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

            // Al conectarse, se marca el usuario como Conectado.
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

                // Deserializamos el mensaje usando opciones para permitir la lectura de números como cadenas.
                var messageString = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
                };
                var wsMessage = JsonSerializer.Deserialize<WebSocketMessage>(messageString, options);
                if (wsMessage != null)
                {
                    // Se asigna el remitente basado en la conexión actual
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

            // Marcar al usuario como Desconectado en la base de datos y en memoria.
            await _lobby.SetUserStatusAsync(userId, UserStatus.Desconectado);

            int connectedCount = _connections.Count;
            await BroadcastMessage(new { Message = $"Hay {connectedCount} usuarios conectados." });
        }
    }

    private async Task ProcessMessage(WebSocketMessage message)
    {
        try
        {
            Console.WriteLine($"📩 Mensaje recibido: {JsonSerializer.Serialize(message)}");

            switch (message.Type)
            {
                case "sendFriendRequest":
                    // Se crea la solicitud de amistad en la BD
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                        if (long.TryParse(message.SenderId, out long senderId) &&
                            long.TryParse(message.ReceiverId, out long receiverId))
                        {
                            bool created = await friendshipService.SendFriendRequestAsync(senderId, receiverId);
                            if (!created)
                            {
                                // Si ya existe una solicitud o amistad, notifica al emisor
                                await SendMessage(message.SenderId, new { Message = "Ya existe una solicitud de amistad o amistad." });
                                return;
                            }
                        }
                        else
                        {
                            Console.WriteLine("❌ Error al convertir SenderId o ReceiverId a long.");
                            return;
                        }
                    }
                    // Se envía la solicitud al receptor, sin importar su estado (la notificación llega cuando se conecte)
                    if (_connections.TryGetValue(message.ReceiverId, out var receiverSocket) &&
                        receiverSocket.State == WebSocketState.Open)
                    {
                        await SendMessage(message.ReceiverId, message);
                    }
                    else
                    {
                        // Notificar al emisor que la solicitud se creó correctamente
                        await SendMessage(message.SenderId, new { Message = "Solicitud de amistad enviada. (El receptor no está conectado actualmente)" });
                    }
                    break;

                case "respondFriendRequest":
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                        if (long.TryParse(message.SenderId, out long senderId) &&
                            long.TryParse(message.ReceiverId, out long receiverId))
                        {
                            bool updated = await friendshipService.RespondFriendRequestAsync(senderId, receiverId, message.Accepted);
                            if (!updated)
                            {
                                await SendMessage(message.SenderId, new { Message = "❌ No se pudo actualizar la solicitud de amistad." });
                                return;
                            }
                        }
                        else
                        {
                            Console.WriteLine("❌ Error al convertir SenderId o ReceiverId a long.");
                            return;
                        }
                    }

                    // Reenviar el mensaje al receptor después de actualizar la base de datos
                    await SendMessage(message.ReceiverId, message);
                    break;


                case "invite":
                    // Para invitaciones de partida (si se usan)
                    if (_lobby.GetUserStatus(message.ReceiverId) == UserStatus.Conectado)
                    {
                        await SendMessage(message.ReceiverId, message);
                    }
                    else
                    {
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

                case "viewPendingRequests":
                    await SendPendingRequests(message.SenderId);
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
                    Console.WriteLine($"⚠️ Tipo de mensaje no reconocido: {message.Type}");
                    break;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error en ProcessMessage: {ex.Message}");
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

    private async Task SendPendingRequests(string userId)
    {
        if (!long.TryParse(userId, out long parsedUserId))
        {
            await SendMessage(userId, new { Message = "ID de usuario inválido." });
            return;
        }

        using (var scope = _serviceScopeFactory.CreateScope())
        {
            var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();

            var pendingRequests = await friendshipService.GetReceivedRequestsAsync(parsedUserId);

            if (pendingRequests.Any())
            {
                var pendingRequestsDto = pendingRequests.Select(req => new
                {
                    SenderId = req.SenderId,
                    SentAt = req.SentAt.ToString("yyyy-MM-dd HH:mm:ss") // O el formato que prefieras
                });

                await SendMessage(userId, new { Message = "Solicitudes pendientes:", Requests = pendingRequestsDto });
            }
            else
            {
                await SendMessage(userId, new { Message = "No tienes solicitudes pendientes." });
            }
        }
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
