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

    public WebSocketHandler(IServiceScopeFactory serviceScopeFactory)
    {
        _serviceScopeFactory = serviceScopeFactory;
    }

    public async Task HandleConnection(WebSocket webSocket, string userId)
    {
        _connections[userId] = webSocket;
        try
        {
            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }
                var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                var json = JsonSerializer.Deserialize<WebSocketMessage>(message);

                if (json != null)
                {
                    using var scope = _serviceScopeFactory.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<DataContext>();

                    switch (json.Type)
                    {
                        case "sendFriendRequest":
                            var friendship = new Friendship
                            {
                                SenderId = long.Parse(json.SenderId),
                                ReceiverId = long.Parse(json.ReceiverId),
                                SentAt = DateTime.UtcNow,
                                Status = FriendshipInvitationStatus.Pendiente
                            };
                            dbContext.Friendships.Add(friendship);
                            await dbContext.SaveChangesAsync();

                            await SendNotification(json.ReceiverId, new WebSocketMessage
                            {
                                Type = "friendRequest",
                                SenderId = json.SenderId,
                                ReceiverId = json.ReceiverId
                            });
                            break;

                        case "respondFriendRequest":
                            var existingFriendship = dbContext.Friendships.FirstOrDefault(f =>
                                f.SenderId == long.Parse(json.SenderId) && f.ReceiverId == long.Parse(json.ReceiverId));
                            if (existingFriendship != null)
                            {
                                existingFriendship.Status = json.Accepted ? FriendshipInvitationStatus.Aceptada : FriendshipInvitationStatus.Rechazada;
                                await dbContext.SaveChangesAsync();

                                await SendNotification(json.SenderId, new WebSocketMessage
                                {
                                    Type = json.Accepted ? "friendRequestAccepted" : "friendRequestRejected",
                                    SenderId = json.ReceiverId,
                                    ReceiverId = json.SenderId,
                                    Accepted = json.Accepted
                                });
                            }
                            break;
                    }
                }
            }
        }
        finally
        {
            _connections.TryRemove(userId, out _);
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed by server", CancellationToken.None);
        }
    }

    public async Task SendNotification(string receiverId, WebSocketMessage message)
    {
        if (_connections.TryGetValue(receiverId, out var receiverSocket))
        {
            var jsonMessage = JsonSerializer.Serialize(message);
            var bytes = Encoding.UTF8.GetBytes(jsonMessage);
            await receiverSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }
}