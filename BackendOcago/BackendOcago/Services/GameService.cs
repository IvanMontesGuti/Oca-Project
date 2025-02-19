using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Dtos;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BackendOcago.Services
{
    public class GameService
    {
        private readonly UnitOfWork _unitOfWork;
        private readonly ILogger<GameService> _logger;
        private readonly Random _random;
        private const int BoardSize = 63;
        private const int DiceMin = 1;
        private const int DiceMax = 7;

        public GameService(
            UnitOfWork unitOfWork,
            ILogger<GameService> logger)
        {
            _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _random = new Random();
        }

        public async Task<GameDTO> CreateGameAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentException("User ID cannot be empty", nameof(userId));

            var game = new Game
            {
                Id = Guid.NewGuid(),
                Player1Id = userId,
                Status = GameStatus.WaitingForPlayers,
                LastUpdated = DateTime.UtcNow,
                Player1Position = 0,
                Player2Position = 0,
                IsPlayer1Turn = true
            };

            try
            {
                await _unitOfWork.GameRepository.InsertAsync(game);
                await _unitOfWork.GameRepository.SaveAsync();

                _logger.LogInformation("Game {GameId} created by user {UserId}", game.Id, userId);
                return MapToGameDTO(game);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating game for user {UserId}", userId);
                throw;
            }
        }

        public async Task<GameDTO> JoinGameAsync(Guid gameId, string userId)
        {
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentException("User ID cannot be empty", nameof(userId));

            try
            {
                await _unitOfWork.BeginTransactionAsync();

                var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                if (game == null)
                {
                    throw new KeyNotFoundException($"Game {gameId} not found");
                }

                if (game.Status != GameStatus.WaitingForPlayers)
                    throw new InvalidOperationException("Game is not available for joining");

                if (game.Player1Id == userId)
                    throw new InvalidOperationException("Cannot join your own game");

                // Update game state
                game.Player2Id = userId;
                game.Status = GameStatus.InProgress;
                game.LastUpdated = DateTime.UtcNow;
                game.IsPlayer1Turn = true;

                await _unitOfWork.GameRepository.UpdateAsync(game);
                await _unitOfWork.SaveAsync(); // Using the correct method name

                // Verify the update was successful within the same transaction
                var verifiedGame = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                if (verifiedGame.Status != GameStatus.InProgress || verifiedGame.Player2Id != userId)
                {
                    await _unitOfWork.RollbackAsync();
                    throw new InvalidOperationException("Failed to update game state");
                }

                await _unitOfWork.CommitAsync();

                _logger.LogInformation(
                    "Game state updated successfully - ID: {GameId}, Status: {Status}, Player1: {Player1}, Player2: {Player2}",
                    game.Id,
                    game.Status,
                    game.Player1Id,
                    game.Player2Id
                );

                return MapToGameDTO(game);
            }
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync();
                _logger.LogError(ex, "Error joining game {GameId} for user {UserId}", gameId, userId);
                throw;
            }
        }

        public async Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string userId)
        {
            if (string.IsNullOrEmpty(userId))
                throw new ArgumentException("User ID cannot be empty", nameof(userId));

            try
            {
                // Primero, obtengamos y loguemos el estado actual del juego
                var gameBeforeMove = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                _logger.LogInformation(
                    "Estado del juego antes del movimiento - ID: {GameId}, Status: {Status}, Player1: {Player1}, Player2: {Player2}, IsPlayer1Turn: {IsPlayer1Turn}",
                    gameBeforeMove.Id,
                    gameBeforeMove.Status,
                    gameBeforeMove.Player1Id,
                    gameBeforeMove.Player2Id,
                    gameBeforeMove.IsPlayer1Turn
                );

                // Comenzar transacción
                await _unitOfWork.BeginTransactionAsync();

                // Obtener el estado del juego dentro de la transacción
                var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                if (game == null)
                {
                    throw new KeyNotFoundException($"Game {gameId} not found");
                }

                _logger.LogInformation(
                    "Estado del juego dentro de la transacción - ID: {GameId}, Status: {Status}, Player1: {Player1}, Player2: {Player2}, IsPlayer1Turn: {IsPlayer1Turn}",
                    game.Id,
                    game.Status,
                    game.Player1Id,
                    game.Player2Id,
                    game.IsPlayer1Turn
                );

                // Validar el movimiento
                ValidateGameMove(game, userId);

                var isPlayer1 = userId == game.Player1Id;
                var diceRoll = _random.Next(1, 7);
                var currentPosition = isPlayer1 ? game.Player1Position : game.Player2Position;
                var newPosition = currentPosition + diceRoll;
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

                // Actualizar y guardar
                await _unitOfWork.GameRepository.UpdateAsync(game);
                await _unitOfWork.SaveAsync();
                await _unitOfWork.CommitAsync();

                // Verificar el estado final
                var finalGameState = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
                _logger.LogInformation(
                    "Estado final del juego - ID: {GameId}, Status: {Status}, Player1: {Player1}, Player2: {Player2}, IsPlayer1Turn: {IsPlayer1Turn}",
                    finalGameState.Id,
                    finalGameState.Status,
                    finalGameState.Player1Id,
                    finalGameState.Player2Id,
                    finalGameState.IsPlayer1Turn
                );

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
            catch (Exception ex)
            {
                await _unitOfWork.RollbackAsync();
                _logger.LogError(ex, "Error making move in game {GameId} for user {UserId}", gameId, userId);
                throw;
            }
        }

        public async Task<GameDTO> GetGameAsync(Guid gameId)
        {
            var game = await GetGameAndValidateAsync(gameId);
            return MapToGameDTO(game);
        }
        public async Task<GameStateDTO> GetGameStateAsync(Guid gameId)
        {
            var game = await GetGameAndValidateAsync(gameId);
            return new GameStateDTO
            {
                GameId = game.Id,
                Status = game.Status,
                Player1Id = game.Player1Id,
                Player2Id = game.Player2Id,
                IsPlayer1Turn = game.IsPlayer1Turn,
                LastUpdated = game.LastUpdated
            };
        }

        // Add this DTO to help with diagnostics
        public class GameStateDTO
        {
            public Guid GameId { get; set; }
            public GameStatus Status { get; set; }
            public string Player1Id { get; set; }
            public string Player2Id { get; set; }
            public bool IsPlayer1Turn { get; set; }
            public DateTime LastUpdated { get; set; }
        }

        public async Task<List<GameDTO>> GetActiveGamesAsync()
        {
            try
            {
                var games = await _unitOfWork.GameRepository.GetActiveGamesAsync();
                return games.Select(MapToGameDTO).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active games");
                throw;
            }
        }

        private async Task<Game> GetGameAndValidateAsync(Guid gameId)
        {
            var game = await _unitOfWork.GameRepository.GetByIdAsync(gameId);
            if (game == null)
            {
                _logger.LogWarning("Game {GameId} not found", gameId);
                throw new KeyNotFoundException($"Game {gameId} not found");
            }
            return game;
        }

        private void ValidateGameMove(Game game, string userId)
        {
            // Loguear el estado del juego durante la validación
            _logger.LogInformation(
                "Validando movimiento - Game: {GameId}, Status: {Status}, Player1: {Player1}, Player2: {Player2}, IsPlayer1Turn: {IsPlayer1Turn}, UserId: {UserId}",
                game.Id,
                game.Status,
                game.Player1Id,
                game.Player2Id,
                game.IsPlayer1Turn,
                userId
            );

            if (game.Status != GameStatus.InProgress)
            {
                throw new InvalidOperationException($"Game is not in progress. Current status: {game.Status}");
            }

            var isPlayer1 = userId == game.Player1Id;
            var isPlayer2 = userId == game.Player2Id;

            if (!isPlayer1 && !isPlayer2)
            {
                throw new InvalidOperationException("User is not a player in this game");
            }

            if ((isPlayer1 && !game.IsPlayer1Turn) || (isPlayer2 && game.IsPlayer1Turn))
            {
                throw new InvalidOperationException("Not your turn");
            }
        }

        private (int Position, string Message) CalculateNewPosition(int currentPosition, int diceRoll)
        {
            var newPosition = currentPosition + diceRoll;
            var message = $"Moved to position {newPosition}";

            if (newPosition > BoardSize)
            {
                newPosition = BoardSize - (newPosition - BoardSize);
                message = $"Rebote! Retrocede a la casilla {newPosition}";
            }

            return (newPosition, message);
        }

        private void UpdateGameState(Game game, bool isPlayer1, int newPosition)
        {
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