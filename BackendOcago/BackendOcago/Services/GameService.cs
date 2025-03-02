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

            // Actualizar la lista de juegos del usuario
            await UpdateUserGamesAsync(game);

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

                // Actualizar la lista de juegos del usuario
                await UpdateUserGamesAsync(game);

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

        public async Task<GameDTO> CreateBotGameAsync(string userId)
        {
            // Create a new game where the user is Player1 and bot is Player2
            var game = new Game
            {
                Id = Guid.NewGuid(),
                Player1Id = userId,
                Player2Id = "bot", // The bot always has the ID "bot"
                Status = GameStatus.InProgress,
                IsPlayer1Turn = true, // User goes first
                Player1Position = 0,
                Player2Position = 0,
                Player1RemainingTurns = 0,
                Player2RemainingTurns = 0,
                LastUpdated = DateTime.UtcNow
            };

            await _unitOfWork.GameRepository.InsertAsync(game);
            await _unitOfWork.GameRepository.CreateAsync(game);
            await _unitOfWork.GameRepository.SaveAsync();

            _activeGames[game.Id] = (userId, "bot");

            // Actualizar la lista de juegos del usuario
            await UpdateUserGamesAsync(game);

            Console.WriteLine($"🤖 Partida contra bot creada para {userId}. ID: {game.Id}");

            // Notify player about the new game
            await NotifyPlayersAsync(game);

            return MapToGameDTO(game);
        }

        public async Task<GameDTO> SurrenderGameAsync(Guid gameId, string userId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null) throw new Exception("Game not found");

            if (game.Status != GameStatus.InProgress)
                throw new InvalidOperationException("Game is not in progress");

            // Verificar que el usuario está en la partida
            if (game.Player1Id != userId && game.Player2Id != userId)
                throw new InvalidOperationException("You are not part of this game");

            // Determinar quién es el ganador (el otro jugador)
            game.Winner = game.Player1Id == userId ? game.Player2Id : game.Player1Id;
            game.Status = GameStatus.Finished;
            game.LastUpdated = DateTime.UtcNow;

            Console.WriteLine($"🏳️ Jugador {userId} se ha rendido. Ganador: {game.Winner}");

            await _unitOfWork.GameRepository.UpdateAsync(game);

            // Actualizar las listas de juegos de los usuarios
            await UpdateUserGamesAsync(game);

            return MapToGameDTO(game);
        }

        private async Task UpdateUserGamesAsync(Game game)
        {
            try
            {
                // Obtener los usuarios
                var player1 = await _unitOfWork.UserRepository.GetByIdAsync(game.Player1Id);
                if (player1 != null)
                {
                    if (player1.Games == null)
                        player1.Games = new List<Game>();

                    // Verificar si el juego ya existe en la lista
                    if (!player1.Games.Any(g => g.Id == game.Id))
                    {
                        player1.Games.Add(game);
                        await _unitOfWork.UserRepository.UpdateAsync(player1);
                    }
                }

                if (!string.IsNullOrEmpty(game.Player2Id))
                {
                    var player2 = await _unitOfWork.UserRepository.GetByIdAsync(game.Player2Id);
                    if (player2 != null)
                    {
                        if (player2.Games == null)
                            player2.Games = new List<Game>();

                        // Verificar si el juego ya existe en la lista
                        if (!player2.Games.Any(g => g.Id == game.Id))
                        {
                            player2.Games.Add(game);
                            await _unitOfWork.UserRepository.UpdateAsync(player2);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating user games: {ex.Message}");
                // No lanzamos la excepción para no interrumpir el flujo principal
            }
        }




        // In GameService.cs, update the MakeMoveAsync method to correctly handle the bot's turn after a player loses a turn

        // Update the MakeMoveAsync method to fix both issues

        public async Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string userId)
        {
            try
            {
                var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                if (game == null) throw new Exception("Game not found");

                if (game.Status != GameStatus.InProgress)
                    throw new InvalidOperationException("Game is not in progress");

                var isPlayer1 = userId == game.Player1Id;
                int currentPosition = isPlayer1 ? game.Player1Position : game.Player2Position;

                // Special case: if playing against a bot
                bool playingAgainstBot = game.Player2Id == "bot" && userId != "bot";
                bool botTrappedInWell = game.Player2Id == "bot" && game.Player2RemainingTurns == int.MaxValue;

                // Verificar que sea el turno del jugador o caso especial para juegos contra bot
                if (!playingAgainstBot && ((isPlayer1 && !game.IsPlayer1Turn) || (!isPlayer1 && game.IsPlayer1Turn)))
                    throw new InvalidOperationException("Not your turn");

                // Verificar si hay turnos pendientes por perder
                // Un valor positivo de PlayerRemainingTurns significa turnos que el jugador debe saltar
                if ((isPlayer1 && game.Player1RemainingTurns > 0) || (!isPlayer1 && game.Player2RemainingTurns > 0))
                {
                    // Don't process lost turns for the bot if it's trapped in the well
                    if (userId == "bot" && game.Player2RemainingTurns == int.MaxValue)
                    {
                        // Bot is trapped in the well, skip turn processing
                        game.IsPlayer1Turn = true; // Give turn back to player
                        await _unitOfWork.GameRepository.UpdateAsync(game);

                        var skipMoveDto = new GameMoveDTO
                        {
                            GameId = gameId,
                            PlayerId = userId,
                            DiceRoll = 0,
                            Player1RemainingTurns = game.Player1RemainingTurns,
                            Player2RemainingTurns = game.Player2RemainingTurns,
                            NewPosition = currentPosition,
                            Message = $"Bot atrapado en el pozo. Tu turno.",
                            GameStatus = game.Status,
                            NextTurnPlayerId = game.Player1Id
                        };

                        await NotifyPlayersAsync(game);
                        return skipMoveDto;
                    }

                    if (isPlayer1)
                        game.Player1RemainingTurns--;
                    else
                        game.Player2RemainingTurns--;

                    // Cambiar el turno al otro jugador
                    game.IsPlayer1Turn = !game.IsPlayer1Turn;

                    await _unitOfWork.GameRepository.UpdateAsync(game);

                    string nextTurnPlayerIdturn = game.IsPlayer1Turn ? game.Player1Id : game.Player2Id;

                    var newMoveDto = new GameMoveDTO
                    {
                        GameId = gameId,
                        PlayerId = userId,
                        DiceRoll = 0,
                        Player1RemainingTurns = game.Player1RemainingTurns,
                        Player2RemainingTurns = game.Player2RemainingTurns,
                        NewPosition = currentPosition, // La posición no cambia
                        Message = $"Jugador {userId} pierde este turno.",
                        GameStatus = game.Status,
                        NextTurnPlayerId = nextTurnPlayerIdturn
                    };

                    await NotifyPlayersAsync(game);

                    // Si el siguiente jugador es el bot, hacer que juegue automáticamente
                    if (nextTurnPlayerIdturn == "bot")
                    {
                        Console.WriteLine("🤖 Turno del bot después de turno perdido. Ejecutando movimiento automático...");

                        // Process bot move immediately for better responsiveness
                        try
                        {
                            // Small delay to give the appearance of the bot "thinking"
                            await Task.Delay(1000);

                            // Check if bot is trapped before moving
                            if (game.Player2RemainingTurns == int.MaxValue)
                            {
                                // Bot is trapped, give turn back to player
                                game.IsPlayer1Turn = true;
                                await _unitOfWork.GameRepository.UpdateAsync(game);
                                await NotifyPlayersAsync(game);
                            }
                            else
                            {
                                // Bot can move normally
                                await MakeMoveAsync(gameId, "bot");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"Error en movimiento automático del bot: {ex.Message}");
                        }
                    }

                    return newMoveDto;
                }

                // Si llegamos aquí, el jugador puede mover normalmente

                // Tirar el dado y calcular nueva posición
                int diceRoll = _random.Next(1, 7);
                int newPosition = currentPosition + diceRoll;
                string message = $"Jugador {userId} lanzó {diceRoll} y avanzó a la casilla {newPosition}.";

                // Manejar casilla 63 y rebote si supera 63
                if (newPosition > 63)
                {
                    int excess = newPosition - 63;
                    newPosition = 63 - excess;
                    message = $"Jugador {userId} lanzó {diceRoll} y rebotó a la casilla {newPosition}.";
                }

                // Si llega exactamente a 63, gana
                if (newPosition == 63)
                {
                    game.Status = GameStatus.Finished;
                    game.Winner = userId;
                    message = $"🏆 ¡Jugador {userId} ha ganado!";
                    game.IsPlayer1Turn = false; // Finaliza el juego

                    // Actualizar la lista de juegos de los usuarios cuando termina la partida
                    await UpdateUserGamesAsync(game);
                }

                // Aplicar reglas especiales
                bool extraTurn = false;

                // Verificar si el otro jugador está en el pozo y liberarlo
                if (newPosition == 31)
                {
                    if (isPlayer1 && game.Player2RemainingTurns == int.MaxValue)
                    {
                        game.Player2RemainingTurns = 0;
                        message += " ¡Has liberado al otro jugador del pozo!";
                    }
                    else if (!isPlayer1 && game.Player1RemainingTurns == int.MaxValue)
                    {
                        game.Player1RemainingTurns = 0;
                        message += " ¡Has liberado al otro jugador del pozo!";
                    }
                }

                // Aplicar reglas según la nueva posición
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
                        // Posada: perder un turno
                        if (isPlayer1)
                            game.Player1RemainingTurns = 1;
                        else
                            game.Player2RemainingTurns = 1;

                        message = $"🏰 ¡Posada! Jugador {userId} pierde un turno.";
                        break;
                    case 31:
                        // Pozo: quedar atrapado
                        if (isPlayer1)
                            game.Player1RemainingTurns = int.MaxValue;
                        else
                            game.Player2RemainingTurns = int.MaxValue;

                        message = $"⛓️ ¡Pozo! Jugador {userId} queda atrapado hasta que otro jugador lo libere.";

                        // Special handling for bot trapped in well
                        if (userId == "bot")
                        {
                            message += " (Como es un bot, puedes seguir jugando)";
                            extraTurn = false;  // Ensure player gets next turn
                            game.IsPlayer1Turn = true;
                        }
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
                int[] casillasOca = { 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59 };
                if (casillasOca.Contains(newPosition))
                {
                    // Buscar la siguiente oca en la lista
                    int nextOcaIndex = Array.IndexOf(casillasOca, newPosition) + 1;
                    if (nextOcaIndex < casillasOca.Length)
                    {
                        int nextOca = casillasOca[nextOcaIndex];
                        newPosition = nextOca;
                        extraTurn = true;
                        message = $"🦆 ¡De Oca en Oca! Jugador {userId} avanza a la casilla {newPosition} y vuelve a tirar.";
                    }
                    else
                    {
                        // Si es la última oca
                        extraTurn = true;
                        message = $"🦆 ¡Oca! Jugador {userId} vuelve a tirar.";
                    }
                }

                // Actualizar la posición del jugador
                if (isPlayer1)
                    game.Player1Position = newPosition;
                else
                    game.Player2Position = newPosition;

                // Cambiar el turno solo si no hay turno extra
                // Special case for bot games: always give control back to player when:
                // 1. It's a bot game AND
                // 2. The current player is the bot AND
                // 3. The bot doesn't get an extra turn
                bool forcePlayerTurn = game.Player2Id == "bot" && userId == "bot" && !extraTurn;

                if (!extraTurn)
                {
                    if (forcePlayerTurn)
                    {
                        game.IsPlayer1Turn = true; // Force player's turn
                    }
                    else
                    {
                        game.IsPlayer1Turn = !game.IsPlayer1Turn;
                    }
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

                string nextTurnPlayerId = game.IsPlayer1Turn ? game.Player1Id : game.Player2Id;

                // Mensaje adicional si el siguiente jugador tiene turnos por perder
                if ((game.IsPlayer1Turn && game.Player1RemainingTurns > 0) ||
                    (!game.IsPlayer1Turn && game.Player2RemainingTurns > 0))
                {
                    message += " El siguiente jugador perderá su turno.";
                }

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
                    NextTurnPlayerId = nextTurnPlayerId
                };

                await NotifyPlayersAsync(game);

                // Si el siguiente turno es del bot y no tiene turno extra, hacer que el bot juegue automáticamente
                if (game.Status == GameStatus.InProgress && nextTurnPlayerId == "bot" && !extraTurn)
                {
                    Console.WriteLine("🤖 Turno del bot. Ejecutando movimiento automático...");

                    // Process bot move immediately for better responsiveness
                    try
                    {
                        // Small delay to give the appearance of the bot "thinking"
                        await Task.Delay(1000);

                        // Check if bot is trapped before moving
                        var updatedGame = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                        if (updatedGame.Player2RemainingTurns == int.MaxValue)
                        {
                            // Bot is trapped, give turn back to player
                            updatedGame.IsPlayer1Turn = true;
                            await _unitOfWork.GameRepository.UpdateAsync(updatedGame);
                            await NotifyPlayersAsync(updatedGame);
                        }
                        else
                        {
                            // Bot can move normally
                            await MakeMoveAsync(gameId, "bot");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error en movimiento automático del bot: {ex.Message}");
                    }
                }

                return moveDto;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in MakeMoveAsync: {ex.Message}");
                throw;
            }
        }

        // Add this helper method to check and fix bot trapped state
        private async Task CheckAndFixBotTrappedState(Game game)
        {
            // If the bot is trapped in the well and it's supposed to be its turn
            if (game.Player2Id == "bot" && game.Player2RemainingTurns == int.MaxValue && !game.IsPlayer1Turn)
            {
                // Force switch turn to player1
                game.IsPlayer1Turn = true;
                await _unitOfWork.GameRepository.UpdateAsync(game);
                await NotifyPlayersAsync(game);
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
