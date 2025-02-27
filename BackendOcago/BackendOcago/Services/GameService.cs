using BackendOcago.Models.Database;
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
                // Use AsNoTracking() to avoid tracking the entity or get a tracked entity directly
                var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                if (game == null) throw new Exception("Game not found");

                if (game.Status != GameStatus.InProgress)
                    throw new InvalidOperationException("Game is not in progress");

                var isPlayer1 = userId == game.Player1Id;

                // Si el jugador tiene turnos pendientes que perder, los reduce y cede el turno
                if (isPlayer1 ? game.Player1RemainingTurns > 0 : game.Player2RemainingTurns > 0)
                {
                    if (isPlayer1) game.Player1RemainingTurns--;
                    else game.Player2RemainingTurns--;

                    // El turno se mantiene en el otro jugador

                    await _unitOfWork.GameRepository.UpdateAsync(game);
                    return new GameMoveDTO
                    {
                        GameId = gameId,
                        PlayerId = userId,
                        DiceRoll = 0,
                        NewPosition = isPlayer1 ? game.Player1Position : game.Player2Position,
                        Message = $"Jugador {userId} pierde este turno.",
                        GameStatus = game.Status,
                        NextTurnPlayerId = game.IsPlayer1Turn ? game.Player1Id : game.Player2Id
                    };
                }

                // Validar si es el turno correcto
                if ((isPlayer1 && !game.IsPlayer1Turn) || (!isPlayer1 && game.IsPlayer1Turn))
                    throw new InvalidOperationException("Not your turn");

                int diceRoll = _random.Next(1, 7);
                int newPosition = (isPlayer1 ? game.Player1Position : game.Player2Position) + diceRoll;
                string message = $"Jugador {userId} lanzó {diceRoll} y llegó a la casilla {newPosition}.";

                // Manejar rebote si supera 63
                if (newPosition > 63)
                {
                    newPosition = 63 - (newPosition - 63);
                    message = $"¡Rebote! Jugador {userId} retrocede a la casilla {newPosition}.";
                }

                // Aplicar reglas especiales
                bool extraTurn = false;
                switch (newPosition)
                {
                    case 6:
                        newPosition = 12;
                        extraTurn = true;
                        message = $"🌉 ¡Puente! Jugador {userId} avanza a la casilla 12 y vuelve a tirar.";
                        break;
                    case 12:
                        newPosition = 6;
                        extraTurn = true;
                        message = $"🌉 ¡Puente! Jugador {userId} regresa a la casilla 6 y vuelve a tirar.";
                        break;
                    case 19:
                        if (isPlayer1) game.Player1RemainingTurns++;
                        else game.Player2RemainingTurns++;
                        message = $"🏰 ¡Posada! Jugador {userId} pierde un turno.";
                        break;
                    case 31:
                        if (isPlayer1) game.Player1RemainingTurns = int.MaxValue;
                        else game.Player2RemainingTurns = int.MaxValue;
                        message = $"⛓️ ¡Pozo! Jugador {userId} queda atrapado hasta que otro jugador lo libere.";
                        break;
                    case 42:
                        newPosition = 30;
                        message = $"🎩 ¡Laberinto! Jugador {userId} retrocede a la casilla 30.";
                        break;
                    case 58:
                        newPosition = 1;
                        message = $"💀 ¡Calavera! Jugador {userId} vuelve a la casilla 1.";
                        break;
                }

                // Manejo de Oca a Oca
                int[] casillasOca = { 9, 18, 27, 36, 45, 54 };
                if (casillasOca.Contains(newPosition))
                {
                    int nextOca = casillasOca.FirstOrDefault(o => o > newPosition);
                    if (nextOca > 0) // Verificar que se encontró una siguiente oca
                    {
                        newPosition = nextOca;
                        extraTurn = true;
                        message = $"🦆 ¡De Oca en Oca! Jugador {userId} avanza a la casilla {newPosition} y vuelve a tirar.";
                    }
                }

                // Actualizar la posición
                if (isPlayer1)
                {
                    game.Player1Position = newPosition;
                    if (!extraTurn) game.IsPlayer1Turn = false;
                }
                else
                {
                    game.Player2Position = newPosition;
                    if (!extraTurn) game.IsPlayer1Turn = true;
                }

                // Si un jugador llega a 63, gana
                if (newPosition == 63)
                {
                    game.Status = GameStatus.Finished;
                    game.Winner = userId;
                    message = $"🏆 ¡Jugador {userId} ha ganado!";
                    game.IsPlayer1Turn = false; // Finaliza el juego
                }

                game.LastUpdated = DateTime.UtcNow;

                await _unitOfWork.GameRepository.UpdateAsync(game);

                var moveDto = new GameMoveDTO
                {
                    GameId = gameId,
                    PlayerId = userId,
                    DiceRoll = diceRoll,
                    Player1RemainingTurns = game.Player1RemainingTurns,
                    Player2RemainingTurns = game.Player2RemainingTurns,
                    NewPosition = newPosition,
                    Message = message,
                    GameStatus = game.Status,
                    NextTurnPlayerId = game.IsPlayer1Turn ? game.Player1Id : game.Player2Id
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
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId); // ⬅ ¡Aquí!
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
                Player1RemainingTurns = game.Player1RemainingTurns,
                Player2RemainingTurns = game.Player2RemainingTurns,
                IsPlayer1Turn = game.IsPlayer1Turn,
                Status = game.Status,
                Winner = game.Winner
            };
        }
    }
}
