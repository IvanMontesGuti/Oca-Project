﻿using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Repositories;
using BackendOcago.Models.Dtos;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Text.Json;

namespace BackendOcago.Services
{
    public class GameService
    {
        private readonly UnitOfWork _unitOfWork;
        private readonly Random _random;
        private static readonly ConcurrentDictionary<string, WebSocket> _connectedPlayers = new();
        private static readonly ConcurrentDictionary<Guid, (string Player1Id, string Player2Id)> _activeGames = new();

        public GameService(UnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _random = new Random();
        }

        public async Task<GameDTO> CreateGameAsync(string userId)
        {
            var game = new Game
            {
                Id = Guid.NewGuid(),
                Player1Id = userId,
                Status = GameStatus.WaitingForPlayers,
                LastUpdated = DateTime.UtcNow
            };

            await _unitOfWork.GameRepository.InsertAsync(game);
            await _unitOfWork.GameRepository.SaveAsync();

            _activeGames[game.Id] = (userId, null);
            return MapToGameDTO(game);
        }

        public async Task<GameDTO> JoinGameAsync(Guid gameId, string userId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null) throw new Exception("Game not found");
            if (game.Player2Id != null) throw new InvalidOperationException("Game is not available");
            if (game.Player1Id == userId) throw new InvalidOperationException("Cannot join your own game");

            game.Player2Id = userId;
            game.Status = GameStatus.InProgress;
            game.LastUpdated = DateTime.UtcNow;

            await _unitOfWork.GameRepository.UpdateAsync(game);
            await _unitOfWork.GameRepository.SaveAsync();

            _activeGames[game.Id] = (game.Player1Id, userId);

            await NotifyPlayersAsync(game);
            return MapToGameDTO(game);
        }

        public async Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string userId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null) throw new Exception("Game not found");
            if (game.Status != GameStatus.InProgress)
                throw new InvalidOperationException("Game is not in progress");

            var isPlayer1 = userId == game.Player1Id;
            if ((isPlayer1 && !game.IsPlayer1Turn) || (!isPlayer1 && game.IsPlayer1Turn))
                throw new InvalidOperationException("Not your turn");

            var diceRoll = _random.Next(1, 7);
            var newPosition = (isPlayer1 ? game.Player1Position : game.Player2Position) + diceRoll;
            var message = $"Moved to position {newPosition}";

            if (newPosition > 63)
            {
                newPosition = 63 - (newPosition - 63);
                message = $"Rebote! Retrocede a la casilla {newPosition}";
            }

            if (isPlayer1)
            {
                game.Player1Position = newPosition;
                game.IsPlayer1Turn = false;
            }
            else
            {
                game.Player2Position = newPosition;
                game.IsPlayer1Turn = true;
            }

            if (newPosition >= 63)
            {
                game.Status = GameStatus.Finished;
                game.Winner = userId;
                message = $"¡Jugador {(isPlayer1 ? "1" : "2")} ha ganado!";
            }

            game.LastUpdated = DateTime.UtcNow;
            await _unitOfWork.GameRepository.UpdateAsync(game);
            await _unitOfWork.GameRepository.SaveAsync();

            await NotifyPlayersAsync(game);

            return new GameMoveDTO
            {
                GameId = gameId,
                PlayerId = userId,
                DiceRoll = diceRoll,
                NewPosition = newPosition,
                Message = message,
                GameStatus = game.Status
            };
        }

        public async Task<GameDTO> GetGameAsync(Guid gameId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null) throw new Exception("Game not found");
            return MapToGameDTO(game);
        }

        public async Task<List<GameDTO>> GetActiveGamesAsync()
        {
            var games = await _unitOfWork.GameRepository.GetActiveGamesAsync();
            return games.Select(MapToGameDTO).ToList();
        }

        private async Task NotifyPlayersAsync(Game game)
        {
            var gameDto = MapToGameDTO(game);
            var json = JsonSerializer.Serialize(gameDto);
            var bytes = Encoding.UTF8.GetBytes(json);
            var segment = new ArraySegment<byte>(bytes);

            await SendMessageIfConnected(game.Player1Id, segment);
            if (!string.IsNullOrEmpty(game.Player2Id))
            {
                await SendMessageIfConnected(game.Player2Id, segment);
            }
        }

        private async Task SendMessageIfConnected(string userId, ArraySegment<byte> message)
        {
            if (_connectedPlayers.TryGetValue(userId, out var socket) && socket.State == WebSocketState.Open)
            {
                await socket.SendAsync(message, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            else
            {
                Console.WriteLine($"⚠️ No se pudo enviar mensaje a {userId}: WebSocket no conectado.");
            }
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
                Status = game.Status,
                Winner = game.Winner
            };
        }
    }
}
