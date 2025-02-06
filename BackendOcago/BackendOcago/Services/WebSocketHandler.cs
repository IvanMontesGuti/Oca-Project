using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Dtos;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BackendOcago.Services;
using BackendOcago.Models.Database.Entities;

public class WebSocketHandler
{
    private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly LobbyService _lobby;
    private static readonly object _lock = new();
    // Diccionario para almacenar solicitudes de amistad pendientes: clave = usuario receptor, valor = lista de IDs de usuarios que enviaron solicitud
    private static readonly Dictionary<string, List<string>> _friendRequests = new Dictionary<string, List<string>>();

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
                    await ProcessMessage(wsMessage, webSocket);
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

    private async Task ProcessMessage(WebSocketMessage message, WebSocket webSocket)
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
                            Console.WriteLine($"📌 RespondFriendRequest - SenderId: {senderId}, ReceiverId: {receiverId}, Accepted: {message.Accepted}");

                            bool updated = await friendshipService.RespondFriendRequestAsync(senderId, receiverId, message.Accepted);
                            if (!updated)
                            {
                                await SendMessage(message.SenderId, new { Message = "❌ No se pudo actualizar la solicitud de amistad." });
                                return;
                            }

                            bool created = await friendshipService.SendFriendRequestAsync(senderId, receiverId);
                            if (!created)
                            {
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
                    // Actualizar el diccionario de solicitudes pendientes para el receptor
                    if (!_friendRequests.ContainsKey(message.ReceiverId))
                    {
                        _friendRequests[message.ReceiverId] = new List<string>();
                    }
                    _friendRequests[message.ReceiverId].Add(message.SenderId);
                    // Se envía la solicitud al receptor, si está conectado
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
                    await SendMessage(message.ReceiverId, message);
                    break;

                case "getPendingFriendRequests":
                    {
                        List<string> requests;
                        if (!_friendRequests.TryGetValue(message.SenderId, out requests))
                        {
                            requests = new List<string>();
                        }
                        var response = new { Type = "pendingFriendRequests", Requests = requests };
                        await SendMessage(message.SenderId, response);
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
                    if (result.HasValue && result.Value.paired)
                    {
                        var opponentId = result.Value.opponent;
                        await SendMessage(message.SenderId, new { Message = "Emparejado", OpponentId = opponentId });
                        await SendMessage(opponentId, new { Message = "Emparejado", OpponentId = message.SenderId });

                        // Crear una lobby automáticamente
                        var lobbyIdsec = await _lobby.CreateLobbyAsync(message.SenderId);
                        if (lobbyIdsec != null)
                        {
                            await _lobby.AddUserToLobbyAsync(message.SenderId, lobbyIdsec);
                            await _lobby.AddUserToLobbyAsync(opponentId, lobbyIdsec);
                            await SendMessage(message.SenderId, new { Type = "lobbyCreated", LobbyId = lobbyIdsec });
                            await SendMessage(opponentId, new { Type = "lobbyCreated", LobbyId = lobbyIdsec });
                        }
                    }
                    else
                    {
                        await SendMessage(message.SenderId, new { Message = "Buscando oponente..." });
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

                case "createLobby":
                    var lobbyId = await _lobby.CreateLobbyAsync(message.SenderId);
                    if (lobbyId != null)
                    {
                        await SendMessage(message.SenderId, new { Type = "lobbyCreated", LobbyId = lobbyId });
                    }
                    else
                    {
                        await SendMessage(message.SenderId, new { Type = "error", Message = "Ya estás en un lobby." });
                    }
                    break;

                case "joinLobby":
                    await _lobby.AddUserToLobbyAsync(message.SenderId, message.LobbyId);
                    if (_lobby.IsUserInLobby(message.SenderId))
                    {
                        await SendMessage(message.SenderId, new { Type = "lobbyJoined", LobbyId = message.LobbyId });
                    }
                    else
                    {
                        await SendMessage(message.SenderId, new { Type = "error", Message = "No se pudo unir al lobby." });
                    }
                    break;

                case "invite":
                    if (_lobby.GetUserLobbyId(message.SenderId) == null)
                    {
                        await SendMessage(message.SenderId, new { Type = "error", Message = "No estás en un lobby." });
                        break;
                    }
                    if (_connections.ContainsKey(message.ReceiverId))
                    {
                        await SendMessage(message.ReceiverId, new { Type = "invitation", From = message.SenderId, LobbyId = _lobby.GetUserLobbyId(message.SenderId) });
                    }
                    else
                    {
                        await SendMessage(message.SenderId, new { Type = "error", Message = "El usuario no está disponible." });
                    }
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

    private async Task CreateLobby(WebSocketMessage message)
    {
        var userId = message.SenderId;
        Console.WriteLine($"Creating lobby for user {userId}...");

        if (_lobby.IsUserInLobby(userId))
        {
            await SendMessage(userId, new { Message = "Ya estás en una lobby." });
            return;
        }

        var lobbyId = await _lobby.CreateLobbyAsync(userId);
        if (lobbyId != null)
        {
            Console.WriteLine($"Lobby created successfully with ID: {lobbyId}");
            await SendMessage(userId, new { Message = "Lobby creada correctamente.", LobbyId = lobbyId });
            await _lobby.AddUserToLobbyAsync(userId, lobbyId);
            if (_connections.TryGetValue(userId, out var webSocket) && webSocket.State == WebSocketState.Open)
            {
                await BroadcastMessage(new { Message = $"El jugador {userId} ha creado una lobby." });
            }
        }
        else
        {
            Console.WriteLine("Error creating lobby.");
            await SendMessage(userId, new { Message = "Hubo un error al crear la lobby." });
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

    private async Task SendMessage(string userId, object message)
    {
        if (_connections.TryGetValue(userId, out var webSocket) && webSocket.State == WebSocketState.Open)
        {
            var jsonMessage = JsonSerializer.Serialize(message);
            var bytes = Encoding.UTF8.GetBytes(jsonMessage);
            await webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}
