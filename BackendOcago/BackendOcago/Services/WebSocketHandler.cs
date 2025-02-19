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
            lock (_lock)
            {
                _connections[userId] = webSocket;
            }

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
                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
                };
                var wsMessage = JsonSerializer.Deserialize<WebSocketMessage>(messageString, options);
                if (wsMessage != null)
                {
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
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                        if (long.TryParse(message.SenderId, out long senderId) &&
                            long.TryParse(message.ReceiverId, out long receiverId))
                        {
                            Console.WriteLine($"📌 SendFriendRequest - SenderId: {senderId}, ReceiverId: {receiverId}");

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

                        if (long.TryParse(message.SenderId, out long responderId) &&
                            long.TryParse(message.ReceiverId, out long originalSenderId))
                        {
                            Console.WriteLine($"📌 RespondFriendRequest - ResponderId: {responderId}, OriginalSenderId: {originalSenderId}, Accepted: {message.Accepted}");

                            bool updated = await friendshipService.RespondFriendRequestAsync(originalSenderId, responderId, message.Accepted);
                            if (!updated)
                            {
                                Console.WriteLine($"❌ No se pudo actualizar la solicitud de amistad entre {originalSenderId} y {responderId}.");
                                await SendMessage(message.SenderId, new { Message = "❌ No se pudo actualizar la solicitud de amistad." });
                                return;
                            }

                            // Eliminar la solicitud de `_friendRequests` si existe
                            if (_friendRequests.ContainsKey(message.ReceiverId))
                            {
                                _friendRequests[message.ReceiverId].Remove(message.SenderId);
                                if (_friendRequests[message.ReceiverId].Count == 0)
                                {
                                    _friendRequests.Remove(message.ReceiverId);
                                }
                            }

                            // Notificar a ambos usuarios del cambio
                            var responseMessage = new
                            {
                                Type = "friendRequestResponse",
                                SenderId = message.SenderId,
                                ReceiverId = message.ReceiverId,
                                Accepted = message.Accepted,
                                Message = message.Accepted ? "✅ Solicitud de amistad aceptada." : "❌ Solicitud de amistad rechazada."
                            };

                            await SendMessage(message.SenderId, responseMessage);
                            await SendMessage(message.ReceiverId, responseMessage);
                            Console.WriteLine($"✅ Solicitud de amistad entre {originalSenderId} y {responderId} procesada correctamente.");
                        }
                        else
                        {
                            Console.WriteLine("❌ Error al convertir SenderId o ReceiverId a long.");
                        }
                    }
                    break;

                case "getPendingFriendRequests":
                    {
                        using (var scope = _serviceScopeFactory.CreateScope())
                        {
                            var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                            var userService = scope.ServiceProvider.GetRequiredService<UserService>();

                            if (!long.TryParse(message.SenderId, out long currentUserId))
                            {
                                Console.WriteLine("❌ Error al convertir SenderId a long en getPendingFriendRequests.");
                                return;
                            }

                            var pendingRequests = await friendshipService.GetPendingFriendRequestsAsync(currentUserId);
                            var requestsWithNicknames = new List<object>();
                            foreach (var friendRequest in pendingRequests)
                            {

                                var user = await userService.GetByIdAsync(friendRequest.SenderId);
                                if (user != null)
                                {
                                    requestsWithNicknames.Add(new
                                    {
                                        Id = user.Id,
                                        Nickname = user.Nickname
                                    });
                                }
                            }

                            var response = new
                            {
                                Type = "pendingFriendRequests",
                                Requests = requestsWithNicknames
                            };

                            await SendMessage(message.SenderId, response);
                        }
                    }
                    break;
                case "getFriends":
                    {
                        using (var scope = _serviceScopeFactory.CreateScope())
                        {
                            var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                            var userService = scope.ServiceProvider.GetRequiredService<UserService>();

                            if (!long.TryParse(message.SenderId, out long currentUserId))
                            {
                                Console.WriteLine("❌ Error al convertir SenderId en getFriends.");
                                return;
                            }

                            var acceptedFriendships = await friendshipService.GetAcceptedFriendshipsForUserAsync(currentUserId);
                            var friendsList = new List<object>();

                            foreach (var friendship in acceptedFriendships)
                            {

                                long friendId = (friendship.SenderId == currentUserId)
                                    ? friendship.ReceiverId
                                    : friendship.SenderId;

                                var friend = await userService.GetByIdAsync(friendId);
                                if (friend != null)
                                {
                                    friendsList.Add(new { Id = friend.Id, Nickname = friend.Nickname });
                                }
                            }

                            var response = new { Type = "friendsList", Friends = friendsList };
                            await SendMessage(message.SenderId, response);
                        }
                    }
                    break;



                case "accept":
                    // Cambiar el estado de ambos usuarios a "Jugando"
                    await _lobby.SetUserStatusAsync(message.SenderId, UserStatus.Jugando);
                    await _lobby.SetUserStatusAsync(message.ReceiverId, UserStatus.Jugando);

                    // Enviar la respuesta de aceptación al receptor
                    var acceptResponse = new
                    {
                        Type = "lobbyInvitationResponse",
                        message.SenderId,
                        message.ReceiverId,
                        message.LobbyId,
                        Status = "accepted",
                        Message = "La invitación para unirte al lobby ha sido aceptada."
                    };
                    await SendMessage(message.ReceiverId, acceptResponse);

                    // Enviar la notificación de aceptación al emisor
                    var senderAcceptResponse = new
                    {
                        Type = "lobbyInvitationResponse",
                        message.SenderId,
                        message.ReceiverId,
                        message.LobbyId,
                        Status = "accepted",
                        Message = "La invitación ha sido aceptada."
                    };
                    await SendMessage(message.SenderId, senderAcceptResponse);
                    break;

                case "reject":
                    var rejectResponse = new
                    {
                        Type = "lobbyInvitationResponse",
                        message.SenderId,
                        message.ReceiverId,
                        message.LobbyId,
                        Status = "rejected",
                        Message = "La invitación para unirte al lobby ha sido rechazada."
                    };
                    await SendMessage(message.ReceiverId, rejectResponse);

                    // Enviar la notificación de rechazo al emisor
                    var senderRejectResponse = new
                    {
                        Type = "lobbyInvitationResponse",
                        message.SenderId,
                        message.ReceiverId,
                        message.LobbyId,
                        Status = "rejected",
                        Message = "La invitación ha sido rechazada."
                    };
                    await SendMessage(message.SenderId, senderRejectResponse);
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
                        await _lobby.SetUserStatusAsync(message.SenderId, UserStatus.BuscandoPartida);
                        await _lobby.SetUserStatusAsync(message.ReceiverId, UserStatus.BuscandoPartida);

                        var opponentId = result.Value.opponent;
                        await SendMessage(message.SenderId, new { Message = "Emparejado", OpponentId = opponentId });
                        await SendMessage(opponentId, new { Message = "Emparejado", message.SenderId });

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
                    Console.WriteLine($"Intentando unir usuario {message.SenderId} al lobby {message.LobbyId}");
                    bool joined = await _lobby.AddUserToLobbyAsync(message.SenderId, message.LobbyId);
                    if (joined)
                    {
                        await SendMessage(message.SenderId, new { Type = "lobbyJoined", message.LobbyId });
                    }
                    else
                    {
                        Console.WriteLine($"Error: No se pudo unir el usuario {message.SenderId} al lobby {message.LobbyId}");
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
                        await SendMessage(message.ReceiverId, new { Type = "invitation", message.SenderId, LobbyId = _lobby.GetUserLobbyId(message.SenderId) });
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
