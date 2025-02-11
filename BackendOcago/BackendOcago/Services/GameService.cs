using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Repositories;
using BackendOcago.Models.Dtos;
using System;
using System.Collections.Generic;

namespace BackendOcago.Services
{
    public class GameService : IGameService
    {
        private readonly IGameRepository _repository;
        private readonly Random _random;

        public GameService(IGameRepository repository)
        {
            _repository = repository;
            _random = new Random();
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
            return MapToGameDTO(game);
        }

        public async Task<GameDTO> JoinGameAsync(Guid gameId, string player2Id)
        {
            var game = await _repository.GetByIdAsync(gameId);
            if (game == null) throw new ("Game not found");
            if (game.Status != GameStatus.WaitingForPlayers)
                throw new InvalidOperationException("Game is not available");
            if (game.Player1Id == player2Id)
                throw new InvalidOperationException("Cannot join your own game");

            game.Player2Id = player2Id;
            game.Status = GameStatus.InProgress;
            game.LastUpdated = DateTime.UtcNow;

            await _repository.UpdateAsync(game);
            return MapToGameDTO(game);
        }

        public async Task<GameDTO> GetGameAsync(Guid gameId)
        {
            var game = await _repository.GetByIdAsync(gameId);
            if (game == null) throw new ("Game not found");
            return MapToGameDTO(game);
        }

        public async Task<List<GameDTO>> GetActiveGamesAsync()
        {
            var games = await _repository.GetActiveGamesAsync();
            return games.Select(MapToGameDTO).ToList();
        }

        public async Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string playerId)
        {
            var game = await _repository.GetByIdAsync(gameId);
            if (game == null) throw new ("Game not found");
            if (game.Status != GameStatus.InProgress)
                throw new InvalidOperationException("Game is not in progress");

            var isPlayer1 = playerId == game.Player1Id;
            if ((isPlayer1 && !game.IsPlayer1Turn) || (!isPlayer1 && game.IsPlayer1Turn))
                throw new InvalidOperationException("Not your turn");

            var currentPosition = isPlayer1 ? game.Player1Position : game.Player2Position;
            var remainingTurns = isPlayer1 ? game.Player1RemainingTurns : game.Player2RemainingTurns;

            if (remainingTurns <= 0)
                throw new InvalidOperationException("No remaining turns");

            var diceRoll = _random.Next(1, 7);
            var newPosition = currentPosition + diceRoll;
            var message = $"Moved to position {newPosition}";
            var isSpecialMove = false;

            // Rebote en la casilla final
            if (newPosition > 63)
            {
                newPosition = 63 - (newPosition - 63);
                message = $"Rebote! Retrocede a la casilla {newPosition}";
            }

            // Procesar casillas especiales
            if (IsOca(newPosition))
            {
                var nextOca = ProcessOca(newPosition);
                message = "¡De oca a oca y tiro porque me toca!";
                isSpecialMove = true;
                newPosition = nextOca;
                if (isPlayer1) game.Player1RemainingTurns++;
                else game.Player2RemainingTurns++;
            }
            else if (IsSpecial(newPosition))
            {
                var (specialPosition, specialTurns, specialMessage) = ProcessSpecial(newPosition);
                message = specialMessage;
                isSpecialMove = true;
                newPosition = specialPosition;

                if (specialTurns < 0)
                {
                    if (isPlayer1) game.Player2RemainingTurns += Math.Abs(specialTurns);
                    else game.Player1RemainingTurns += Math.Abs(specialTurns);
                }
                else if (specialTurns > 0)
                {
                    if (isPlayer1) game.Player1RemainingTurns += specialTurns - 1;
                    else game.Player2RemainingTurns += specialTurns - 1;
                }
                else // specialTurns == 0
                {
                    if (isPlayer1) game.Player1RemainingTurns = 0;
                    else game.Player2RemainingTurns = 0;
                }
            }

            // Actualizar posición y turnos
            if (isPlayer1)
            {
                game.Player1Position = newPosition;
                game.Player1RemainingTurns--;
                if (game.Player1RemainingTurns <= 0) game.IsPlayer1Turn = false;
            }
            else
            {
                game.Player2Position = newPosition;
                game.Player2RemainingTurns--;
                if (game.Player2RemainingTurns <= 0) game.IsPlayer1Turn = true;
            }

            // Verificar victoria
            if (newPosition >= 63)
            {
                game.Status = GameStatus.Finished;
                game.Winner = playerId;
                message = $"¡Jugador {(isPlayer1 ? "1" : "2")} ha ganado!";
            }

            game.LastUpdated = DateTime.UtcNow;
            await _repository.UpdateAsync(game);

            return new GameMoveDTO
            {
                GameId = gameId,
                PlayerId = playerId,
                DiceRoll = diceRoll,
                NewPosition = newPosition,
                Message = message,
                IsSpecialMove = isSpecialMove,
                GameStatus = game.Status
            };
        }

        private bool IsOca(int position)
        {
            int[] ocas = { 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59 };
            return Array.IndexOf(ocas, position) != -1;
        }

        private bool IsSpecial(int position)
        {
            int[] especiales = { 6, 12, 19, 26, 31, 42, 52, 53, 58 };
            return Array.IndexOf(especiales, position) != -1;
        }

        private int ProcessOca(int position)
        {
            if (position == 59) return 63;
            int[] ocas = { 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59 };
            return ocas.First(x => x > position);
        }

        private (int position, int turns, string message) ProcessSpecial(int position)
        {
            return position switch
            {
                6 => (12, 1, "¡De puente a puente y tiro porque me lleva la corriente!"),
                12 => (6, 1, "¡De puente a puente y tiro porque me lleva la corriente!"),
                19 => (19, -1, "¡Posada! Pierdes un turno."),
                26 => (53, 1, "¡De dados a dados y tiro porque me ha tocado!"),
                31 => (31, -2, "¡Pozo! Pierdes dos turnos."),
                42 => (30, 0, "¡Laberinto! Retrocedes a la casilla 30."),
                52 => (52, -2, "¡Cárcel! Pierdes dos turnos."),
                53 => (26, 1, "¡De dados a dados y tiro porque me ha tocado!"),
                58 => (1, 0, "¡Muerte! Vuelves al inicio."),
                _ => (position, 1, "Casilla normal")
            };
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
    }
}
