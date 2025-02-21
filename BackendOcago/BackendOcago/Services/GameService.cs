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
        public async Task ConnectPlayerAsync(string userId, WebSocket socket)
        {
            _connectedPlayers[userId] = socket;
            Console.WriteLine($"✅ WebSocket registrado para {userId}");

            // Escucha mensajes entrantes (opcional)
            await ListenToWebSocket(userId, socket);
        }

        private async Task ListenToWebSocket(string userId, WebSocket socket)
        {
            var buffer = new byte[1024 * 4];

            try
            {
                while (socket.State == WebSocketState.Open)
                {
                    var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        _connectedPlayers.TryRemove(userId, out _);
                        Console.WriteLine($"❌ WebSocket cerrado para {userId}");
                        await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Cerrado por el usuario", CancellationToken.None);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Error en WebSocket de {userId}: {ex.Message}");
            }
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
            await _unitOfWork.GameRepository.CreateAsync(game);
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

            try
            {
                await _unitOfWork.GameRepository.newUpdateAsync(game);

                _activeGames[game.Id] = (game.Player1Id, userId);
                Console.WriteLine($"Game updated successfully. Player2Id: {userId}, Status: {game.Status}");

                var gameDto = MapToGameDTO(game);

                // 🚀 Si el jugador 2 es "bot" y es su turno, hacer que mueva automáticamente
                if (userId == "bot" && !game.IsPlayer1Turn)
                {
                    Console.WriteLine("🤖 Bot detectado. Ejecutando turno automático...");
                    await Task.Delay(1000); // Pequeña pausa para simular respuesta humana
                    await MakeMoveAsync(game.Id, userId);
                }

                return gameDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating game: {ex.Message}");
                throw;
            }
        }


        public async Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string userId)
        {
            try
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
                var message = $"Jugador {userId} movió {diceRoll} casillas, ahora está en {newPosition}.";

                if (newPosition > 63)
                {
                    newPosition = 63 - (newPosition - 63);
                    message = $"Rebote! Retrocede a la casilla {newPosition}.";
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

                string nextPlayerId = game.IsPlayer1Turn ? game.Player1Id : game.Player2Id;

                if (newPosition >= 63)
                {
                    game.Status = GameStatus.Finished;
                    game.Winner = userId;
                    message = $"¡Jugador {userId} ha ganado!";
                    nextPlayerId = null; // No hay siguiente turno, ya terminó
                }

                game.LastUpdated = DateTime.UtcNow;

                await _unitOfWork.GameRepository.newUpdateAsync(game);

                var moveDto = new GameMoveDTO
                {
                    GameId = gameId,
                    PlayerId = userId,
                    DiceRoll = diceRoll,
                    NewPosition = newPosition,
                    Message = message,
                    GameStatus = game.Status,
                    NextTurnPlayerId = nextPlayerId // Nuevo campo para el siguiente turno
                };

                await NotifyPlayersAsync(game);

                return moveDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in MakeMoveAsync: {ex.Message}");
                throw;
            }
        }


        public async Task<GameDTO> GetGameAsync(Guid gameId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null) throw new Exception("Game not found");

            // Agregamos logging para debug
            Console.WriteLine($"Retrieved game {gameId}: Player1={game.Player1Id}, Player2={game.Player2Id}, Status={game.Status}");

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
            var socket = WebSocketConnectionManager.GetConnection(userId);
            if (socket != null && socket.State == WebSocketState.Open)
            {
                await socket.SendAsync(message, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            else
            {
                Console.WriteLine($"⚠️ No se pudo enviar mensaje a {userId}: WebSocket no conectado.");
            }
        }


        // Nueva clase para gestionar las conexiones WebSocket
        public static class WebSocketConnectionManager
        {
            // Diccionario estático para almacenar las conexiones activas
            private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();

            public static void AddConnection(string userId, WebSocket webSocket)
            {
                if (_connections.ContainsKey(userId))
                {
                    _connections[userId].Abort();
                }

                _connections[userId] = webSocket;
            }

            public static WebSocket GetConnection(string userId)
            {
                _connections.TryGetValue(userId, out var socket);
                return socket;
            }

            public static void RemoveConnection(string userId)
            {
                _connections.TryRemove(userId, out _);
            }

            public static int ActiveConnectionsCount => _connections.Count;
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
