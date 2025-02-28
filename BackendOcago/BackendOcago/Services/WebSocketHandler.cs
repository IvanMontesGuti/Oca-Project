using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Services;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BackendOcago.Models.Database;
using Microsoft.EntityFrameworkCore;

public class WebSocketHandler
{
    private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly MatchMakingService _matchMakingService;
    private static readonly object _lock = new();
    private static readonly Dictionary<string, List<string>> _friendRequests = new Dictionary<string, List<string>>();

    public WebSocketHandler(IServiceScopeFactory serviceScopeFactory, MatchMakingService matchMakingService)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _matchMakingService = matchMakingService;
    }

    public async Task HandleConnection(WebSocket webSocket, string userId)
    {
        try
        {
            lock (_lock)
            {
                _connections[userId] = webSocket;
            }

            // Actualiza el status del usuario a "Conectado" (status = 1)
            using (var scope = _serviceScopeFactory.CreateScope())
            {
                var userService = scope.ServiceProvider.GetRequiredService<UserService>();
                if (!long.TryParse(userId, out long numericUserId))
                {
                    Console.WriteLine("❌ Error al convertir userId a long.");
                }
                else
                {
                    await userService.UpdateStatus(UserStatus.Conectado, numericUserId);
                }
            }

            // Notifica a todos el número de usuarios conectados en tiempo real
            int connectedCount = _connections.Count;
            await BroadcastMessage(new { Type = "connectedCount", Count = connectedCount });
            await SendMessage(userId, new { Message = $"Bienvenido, hay {connectedCount} usuarios conectados." });

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

            // Actualiza el status del usuario a "Desconectado" (status = 0)
            // Actualiza el status del usuario a "Conectado" (status = 1)
            using (var scope = _serviceScopeFactory.CreateScope())
            {
                var userService = scope.ServiceProvider.GetRequiredService<UserService>();
                if (!long.TryParse(userId, out long numericUserId))
                {
                    Console.WriteLine("❌ Error al convertir userId a long.");
                }
                else
                {
                    await userService.UpdateStatus(UserStatus.Desconectado, numericUserId);
                }
            }

            int connectedCount = _connections.Count;
            await BroadcastMessage(new { Type = "connectedCount", Count = connectedCount });
        }
    }

    private async Task ProcessMessage(WebSocketMessage message, WebSocket webSocket)
    {
        try
        {
            Console.WriteLine($"📩 Mensaje recibido: {JsonSerializer.Serialize(message)}");

            switch (message.Type)
            {
                case "connectedUsers":
                    {
                        int count = _connections.Count;
                        await SendMessage(message.SenderId, new { Type = "connectedUsers", Count = count });
                        break;
                    }

                case "sendFriendRequest":
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
                        var friendshipService = scope.ServiceProvider.GetRequiredService<FriendshipService>();
                        var userService = scope.ServiceProvider.GetRequiredService<UserService>();

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

                        if (!_friendRequests.ContainsKey(message.ReceiverId))
                        {
                            _friendRequests[message.ReceiverId] = new List<string>();
                        }
                        _friendRequests[message.ReceiverId].Add(message.SenderId);

                        var senderUser = await userService.GetByIdAsync(senderId);
                        string senderNickname = senderUser?.Nickname ?? "Desconocido";

                        if (_connections.TryGetValue(message.ReceiverId, out var receiverSocket) &&
                            receiverSocket.State == WebSocketState.Open)
                        {
                            var data = new
                            {
                                Type = "sendFriendRequest",
                                SenderId = message.SenderId,
                                SenderNickname = senderNickname, 
                                ReceiverId = message.ReceiverId
                            };
                            await SendMessage(message.ReceiverId, data);
                        }
                        else
                        {
                            await SendMessage(message.SenderId, new { Message = "Solicitud de amistad enviada. (El receptor no está conectado actualmente)" });
                        }
                        break;
                    }


                case "respondFriendRequest":
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
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

                            if (_friendRequests.ContainsKey(message.ReceiverId))
                            {
                                _friendRequests[message.ReceiverId].Remove(message.SenderId);
                                if (_friendRequests[message.ReceiverId].Count == 0)
                                {
                                    _friendRequests.Remove(message.ReceiverId);
                                }
                            }

                            var responseMessage = new
                            {
                                Type = "friendRequestResponse",
                                SenderId = message.SenderId,
                                ReceiverId = message.ReceiverId,
                                Accepted = message.Accepted,
                                Message = message.Accepted
                                    ? "✅ Solicitud de amistad aceptada."
                                    : "❌ Solicitud de amistad rechazada."
                            };

                            await SendMessage(message.SenderId, responseMessage);
                            await SendMessage(message.ReceiverId, responseMessage);
                            Console.WriteLine("✅ Solicitud de amistad procesada correctamente.");
                        }
                        else
                        {
                            Console.WriteLine("❌ Error al convertir SenderId o ReceiverId a long.");
                        }
                        break;
                    }

                case "getPendingFriendRequests":
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
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
                        break;
                    }

                case "getFriends":
                    {
                        using var scope = _serviceScopeFactory.CreateScope();
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
                                friendsList.Add(new { Id = friend.Id, Nickname = friend.Nickname, Status = friend.Status, AvatarUrl = friend.AvatarUrl});
                            }
                        }

                        var response = new { Type = "friendsList", Friends = friendsList };
                        await SendMessage(message.SenderId, response);
                        break;
                    }

                case "findRandomMatch":
                    {
                        int hostId = int.Parse(message.SenderId);
                        var match = await _matchMakingService.CreateRandomMatchAsync(hostId);

                        // Solo si está "Matched" y hay Guest asignado
                        if (match.Status == "Matched" && match.GuestId.HasValue)
                        {
                            int finalHost = match.HostId;
                            int finalGuest = match.GuestId.Value;

                            await SendMessage(finalHost.ToString(), new
                            {
                                Message = $"✅ Emparejado con {finalGuest}. Partida: {match.MatchRequestId}"
                            });

                            await SendMessage(finalGuest.ToString(), new
                            {
                                Message = $"✅ Emparejado con {finalHost
                                }. Partida: {match.MatchRequestId}"
                            });
                        }
                        else
                        {
                            await SendMessage(message.SenderId, new
                            {
                                Message = "🔍 Buscando oponente..."
                            });
                        }
                        break;
                    }

                case "sendInvitation":
                    {
                        if (!int.TryParse(message.SenderId, out int hostId) ||
                            !int.TryParse(message.ReceiverId, out int receiverId))
                        {
                            Console.WriteLine("❌ Error al convertir IDs en sendInvitation.");
                            return;
                        }

                        using var scope = _serviceScopeFactory.CreateScope();
                        var userService = scope.ServiceProvider.GetRequiredService<UserService>();

                        // Obtenemos el nickname del usuario que envía la invitación (host)
                        var hostUser = await userService.GetByIdAsync(hostId);
                        string hostNickname = hostUser?.Nickname ?? "Desconocido";

                        // Creamos la invitación
                        var invitation = await _matchMakingService.SendInvitationAsync(hostId, receiverId);

                        // Notificamos al host que la invitación se envió correctamente
                        await SendMessage(message.SenderId, new { Message = "Invitación enviada.", MatchRequestId = invitation.MatchRequestId });

                        // Notificamos al receptor, enviando además el nickname del host
                        await SendMessage(message.ReceiverId, new { Type = "invitationReceived", HostId = hostId, HostNickname = hostNickname, MatchRequestId = invitation.MatchRequestId });
                        break;
                    }

                case "respondInvitation":
                    {
                        if (!int.TryParse(message.SenderId, out int receiverId))
                        {
                            Console.WriteLine("❌ Error al convertir IDs en respondInvitation.");
                            return;
                        }
                        string matchRequestId = message.MatchRequestId;
                        bool accepted = message.Accepted;
                        var updatedInvitation = await _matchMakingService.RespondInvitationAsync(matchRequestId, receiverId, accepted);
                        if (updatedInvitation == null)
                        {
                            await SendMessage(message.SenderId, new { Message = "No se pudo procesar la invitación." });
                            return;
                        }

                        if (accepted)
                        {
                            await SendMessage(updatedInvitation.HostId.ToString(), new { Message = $"✅ Emparejado con {receiverId}. Partida: {updatedInvitation.GameId}" });
                            await SendMessage(message.SenderId, new { Message = $"✅ Emparejado con {updatedInvitation.HostId}. Partida: {updatedInvitation.GameId}" });
                        }
                        else
                        {
                            await SendMessage(updatedInvitation.HostId.ToString(), new { Message = "❌ Tu invitación fue rechazada." });
                            await SendMessage(message.SenderId, new { Message = "Has rechazado la invitación." });
                        }
                        break;
                    }

                case "cancelMatch":
                    {
                        if (!int.TryParse(message.SenderId, out int hostId))
                        {
                            Console.WriteLine("❌ Error al convertir SenderId en cancelMatch.");
                            return;
                        }
                        bool cancelled = await _matchMakingService.CancelMatchAsync(hostId);
                        if (cancelled)
                        {
                            await SendMessage(message.SenderId, new { Message = "Búsqueda cancelada." });
                        }
                        else
                        {
                            await SendMessage(message.SenderId, new { Message = "No se encontró búsqueda para cancelar." });
                        }
                        break;
                    }

                case "confirmReady":
                    {
                        if (!int.TryParse(message.SenderId, out int userId))
                        {
                            Console.WriteLine("❌ Error al convertir SenderId en confirmReady.");
                            return;
                        }
                        string matchRequestId = message.MatchRequestId;
                        var match = await _matchMakingService.ConfirmReadyAsync(matchRequestId, userId);
                        if (match == null)
                        {
                            await SendMessage(message.SenderId, new { Message = "No se encontró la solicitud de partida." });
                            return;
                        }
                        if (match.HostReady && match.GuestReady)
                        {
                            await SendMessage(match.HostId.ToString(), new
                            {
                                Type = "startGame",
                                HostId = match.HostId,
                                GuestId = match.GuestId,
                                GameId = match.GameId,
                                Message = "Ambos jugadores están listos. Iniciando partida."
                            });
                            await SendMessage(match.GuestId.ToString(), new
                            {
                                Type = "startGame",
                                HostId = match.HostId,
                                GuestId = match.GuestId,
                                GameId = match.GameId,
                                Message = "Ambos jugadores están listos. Iniciando partida."
                            });
                        }
                        else
                        {
                            await SendMessage(message.SenderId, new { Message = "Confirmación recibida. Esperando al otro jugador." });
                        }
                        break;
                    }
                case "roomInfo":
                    {
                        // Verificamos que se haya enviado un MatchRequestId
                        if (string.IsNullOrWhiteSpace(message.MatchRequestId))
                        {
                            await SendMessage(message.SenderId, new { Message = "No se proporcionó MatchRequestId." });
                            break;
                        }

                        using var scope = _serviceScopeFactory.CreateScope();
                        var context = scope.ServiceProvider.GetRequiredService<DataContext>();
                        var userService = scope.ServiceProvider.GetRequiredService<UserService>();

                        // Usamos directamente el MatchRequestId enviado (ya es string)
                        string matchRequestId = message.MatchRequestId;
                        Console.WriteLine($"[roomInfo] Buscando MatchRequest con ID: {matchRequestId}");

                        // Buscamos la solicitud de partida en la base de datos
                        var matchRequest = await context.MatchRequests
                            .FirstOrDefaultAsync(m => m.MatchRequestId == matchRequestId);

                        if (matchRequest == null)
                        {
                            Console.WriteLine("[roomInfo] No se encontró la solicitud de partida.");
                            await SendMessage(message.SenderId, new { Message = "No se encontró la solicitud de partida." });
                            break;
                        }

                        // Obtenemos la información del host
                        var host = await userService.GetByIdAsync(matchRequest.HostId);
                        // Obtenemos la información del guest, si existe
                        UserDto guest = null;
                        if (matchRequest.GuestId.HasValue)
                        {
                            guest = await userService.GetByIdAsync((long)matchRequest.GuestId.Value);
                        }

                        // Construimos la lista de jugadores con la información completa
                        var players = new List<object>();
                        if (host != null)
                        {
                            players.Add(new
                            {
                                Id = host.Id,
                                Nickname = host.Nickname,
                                AvatarUrl = host.AvatarUrl, // Asegúrate de que esta propiedad exista en tu entidad User
                                IsReady = matchRequest.HostReady,
                                IsHost = true
                            });
                        }
                        if (guest != null)
                        {
                            players.Add(new
                            {
                                Id = guest.Id,
                                Nickname = guest.Nickname,
                                AvatarUrl = guest.AvatarUrl,
                                IsReady = matchRequest.GuestReady,
                                IsHost = false
                            });
                        }

                        var roomResponse = new
                        {
                            Type = "roomInfo",
                            MatchRequestId = matchRequest.MatchRequestId,
                            GameId = matchRequest.GameId,
                            Players = players
                        };

                        Console.WriteLine("[roomInfo] Respuesta generada: " + JsonSerializer.Serialize(roomResponse));
                        await SendMessage(message.SenderId, roomResponse);
                        break;
                    }


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
                sendTasks.Add(connection.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    endOfMessage: true,
                    cancellationToken: CancellationToken.None
                ));
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
            await webSocket.SendAsync(
                new ArraySegment<byte>(bytes),
                WebSocketMessageType.Text,
                endOfMessage: true,
                cancellationToken: CancellationToken.None
            );
        }
    }
}
