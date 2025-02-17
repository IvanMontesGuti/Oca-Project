using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Repositories;
using BackendOcago.Models.Dtos;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.WebSockets;
using System.Text;
using System.Threading;

namespace BackendOcago.Services
{
    public class GameService : IGameService
    {
        private readonly IGameRepository _repository;
        private readonly Random _random;
        private static readonly Dictionary<string, WebSocket> _connectedPlayers = new();

        public GameService(IGameRepository repository)
        {
            _repository = repository;
            _random = new Random();
        }

        public async Task HandleWebSocketAsync(WebSocket webSocket, string playerId)
        {
            _connectedPlayers[playerId] = webSocket;
            await BroadcastMessageAsync($"Player {playerId} connected. Active players: {string.Join(", ", _connectedPlayers.Keys)}");

            var buffer = new byte[1024 * 4];
            while (webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    _connectedPlayers.Remove(playerId);
                    await BroadcastMessageAsync($"Player {playerId} disconnected. Active players: {string.Join(", ", _connectedPlayers.Keys)}");
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Connection closed", CancellationToken.None);
                }
            }
        }

        private async Task BroadcastMessageAsync(string message)
        {
            var buffer = Encoding.UTF8.GetBytes(message);
            var tasks = _connectedPlayers.Values.Select(socket =>
                socket.SendAsync(new ArraySegment<byte>(buffer), WebSocketMessageType.Text, true, CancellationToken.None));
            await Task.WhenAll(tasks);
        }

        public async Task<GameDTO> CreateGameAsync(string player1Id)
        {
            var game = new Game
            {
                Id = Guid.NewGuid(),
                Player1Id = player1Id,
                Status = GameStatus.WaitingForPlayers,
                LastUpdated = DateTime.UtcNow
            };

            await _repository.CreateAsync(game);
            await BroadcastMessageAsync($"New game created by player {player1Id}");
            return MapToGameDTO(game);
        }

        public async Task<GameDTO> JoinGameAsync(Guid gameId, string player2Id)
        {
            var game = await _repository.GetByIdAsync(gameId);
            if (game == null) throw new("Game not found");
            if (game.Status != GameStatus.WaitingForPlayers && game.Status != GameStatus.InProgress)
                throw new InvalidOperationException("Game is not available");
            if (game.Player1Id == player2Id)
                throw new InvalidOperationException("Cannot join your own game");

            game.Player2Id = player2Id;
            game.Status = GameStatus.InProgress;
            game.LastUpdated = DateTime.UtcNow;

            await _repository.UpdateAsync(game);
            await BroadcastMessageAsync($"Player {player2Id} joined game {gameId}");
            return MapToGameDTO(game);
        }

        public async Task<GameDTO> GetGameAsync(Guid gameId)
        {
            var game = await _repository.GetByIdAsync(gameId);
            if (game == null) throw new("Game not found");
            return MapToGameDTO(game);
        }

        public async Task<List<GameDTO>> GetActiveGamesAsync()
        {
            var games = await _repository.GetActiveGamesAsync();
            return games.Select(MapToGameDTO).ToList();
        }

        private GameDTO MapToGameDTO(Game game)
        {
            return new GameDTO
            {
                Id = game.Id,
                Player1Id = game.Player1Id,
                Player2Id = game.Player2Id,
                Player1Position = game.Player1Position,
                Player2Position = game.Player2Position,
                IsPlayer1Turn = game.IsPlayer1Turn,
                Player1RemainingTurns = game.Player1RemainingTurns,
                Player2RemainingTurns = game.Player2RemainingTurns,
                Status = game.Status, 
                Winner = game.Winner
            };
        }

        public Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string playerId)
        {
            throw new NotImplementedException();
        }
    }



}
