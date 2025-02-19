using BackendOcago.Models.Dtos;
using BackendOcago.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace BackendOcago.Controllers
{
    [ApiController]
    [Route("ws/game/{userId}")]
    public class GameWebSocketController : ControllerBase
    {
        private readonly GameService _gameService;
        private readonly ILogger<GameWebSocketController> _logger;
        private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
        private const int BufferSize = 4 * 1024; // 4KB

        public GameWebSocketController(GameService gameService, ILogger<GameWebSocketController> logger)
        {
            _gameService = gameService ?? throw new ArgumentNullException(nameof(gameService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpGet("connect")]
        public async Task Connect(string userId, CancellationToken cancellationToken)
        {
            if (!HttpContext.WebSockets.IsWebSocketRequest)
            {
                HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }

            var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

            // Remove and close any existing connection
            if (_connections.TryRemove(userId, out var existingSocket))
            {
                try
                {
                    await existingSocket.CloseAsync(
                        WebSocketCloseStatus.NormalClosure,
                        "New connection established",
                        cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error closing existing connection for user {UserId}", userId);
                }
            }

            if (_connections.TryAdd(userId, webSocket))
            {
                _logger.LogInformation("User {UserId} connected. Total connections: {Count}",
                    userId, _connections.Count);

                try
                {
                    await HandleWebSocketConnection(userId, webSocket, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error handling WebSocket connection for user {UserId}", userId);
                }
                finally
                {
                    _connections.TryRemove(userId, out _);
                    if (webSocket.State == WebSocketState.Open)
                    {
                        await webSocket.CloseAsync(
                            WebSocketCloseStatus.InternalServerError,
                            "Connection terminated",
                            cancellationToken);
                    }
                }
            }
        }

        private async Task HandleWebSocketConnection(string userId, WebSocket webSocket, CancellationToken cancellationToken)
        {
            var buffer = new byte[BufferSize];

            while (webSocket.State == WebSocketState.Open)
            {
                try
                {
                    var result = await webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        cancellationToken);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        await webSocket.CloseAsync(
                            WebSocketCloseStatus.NormalClosure,
                            "Client requested close",
                            cancellationToken);
                        break;
                    }

                    var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    await ProcessMessage(userId, message, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    // Normal cancellation, just exit
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing message for user {UserId}", userId);
                    await SendErrorToClient(userId, "Error processing message", cancellationToken);
                    break;
                }
            }
        }

        private async Task ProcessMessage(string userId, string message, CancellationToken cancellationToken)
        {
            WebSocketRequest? request;
            try
            {
                request = JsonSerializer.Deserialize<WebSocketRequest>(message);
                if (request == null) throw new JsonException("Message could not be deserialized");
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid message format from user {UserId}: {Message}", userId, message);
                await SendErrorToClient(userId, "Invalid message format", cancellationToken);
                return;
            }

            try
            {
                switch (request.Action)
                {
                    case "MakeMove":
                        // Add diagnostic logging before the move
                        var gameState = await _gameService.GetGameStateAsync(request.GameId);
                        _logger.LogInformation(
                            "Attempting move - Game State: Status={Status}, Player1={Player1}, Player2={Player2}, IsPlayer1Turn={IsPlayer1Turn}",
                            gameState.Status,
                            gameState.Player1Id,
                            gameState.Player2Id,
                            gameState.IsPlayer1Turn
                        );

                        var move = await _gameService.MakeMoveAsync(request.GameId, userId);
                        await NotifyPlayers(move, cancellationToken);
                        break;

                    case "CreateGame":
                        var game = await _gameService.CreateGameAsync(userId);
                        await SendMessageToClient(userId, game, cancellationToken);
                        break;

                    case "JoinGame":
                        var joinedGame = await _gameService.JoinGameAsync(request.GameId, userId);
                        if (joinedGame != null)
                        {
                            await NotifyPlayers(joinedGame, cancellationToken);
                        }
                        break;

                    case "GetGame":
                        var gameInfo = await _gameService.GetGameAsync(request.GameId);
                        await SendMessageToClient(userId, gameInfo, cancellationToken);
                        break;

                    case "GetActiveGames":
                        var games = await _gameService.GetActiveGamesAsync();
                        await SendMessageToClient(userId, games, cancellationToken);
                        break;

                    default:
                        _logger.LogWarning("Unknown action {Action} from user {UserId}", request.Action, userId);
                        await SendErrorToClient(userId, $"Unknown action: {request.Action}", cancellationToken);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing action {Action} for user {UserId}", request.Action, userId);
                await SendErrorToClient(userId, ex.Message, cancellationToken);
            }
        }

        private async Task NotifyPlayers(object data, CancellationToken cancellationToken)
        {
            if (data is GameDTO game)
            {
                var tasks = new List<Task>();

                if (!string.IsNullOrEmpty(game.Player1Id))
                {
                    tasks.Add(SendMessageToClient(game.Player1Id, game, cancellationToken));
                }
                if (!string.IsNullOrEmpty(game.Player2Id))
                {
                    tasks.Add(SendMessageToClient(game.Player2Id, game, cancellationToken));
                }

                await Task.WhenAll(tasks);
            }
        }

        private async Task SendMessageToClient(string userId, object data, CancellationToken cancellationToken)
        {
            if (!_connections.TryGetValue(userId, out var socket) || socket.State != WebSocketState.Open)
            {
                _logger.LogWarning("Cannot send message to user {UserId}: Socket not available", userId);
                return;
            }

            try
            {
                var json = JsonSerializer.Serialize(data);
                var bytes = Encoding.UTF8.GetBytes(json);
                await socket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    true,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to user {UserId}", userId);
                throw;
            }
        }

        private async Task SendErrorToClient(string userId, string message, CancellationToken cancellationToken)
        {
            await SendMessageToClient(userId, new { error = message }, cancellationToken);
        }
    }

    public record WebSocketRequest
    {
        public required string Action { get; init; }
        public Guid GameId { get; init; }
    }
}