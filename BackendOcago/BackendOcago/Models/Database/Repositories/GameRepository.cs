using BackendOcago.Models.Database.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database.Repositories
{
    public class GameRepository : Repository<Game>
    {
        private readonly DataContext _context;

        public GameRepository(DataContext context) : base(context)
        {
            _context = context;
        }

        public async Task<Game> GetByIdAsync(Guid id)
        {
            try
            {
                // Siempre usar AsNoTracking para evitar problemas de tracking
                var game = await _context.Games
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.Id == id);

                if (game != null)
                {
                    Console.WriteLine($"GetByIdAsync - Retrieved game {id}:");
                    Console.WriteLine($"Player1Id: {game.Player1Id}");
                    Console.WriteLine($"Player2Id: {game.Player2Id}");
                    Console.WriteLine($"Status: {game.Status}");
                    Console.WriteLine($"IsPlayer1Turn: {game.IsPlayer1Turn}");
                }

                return game;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByIdAsync: {ex.Message}");
                throw;
            }
        }

        public async Task newUpdateAsync(Game game)
        {
            try
            {
                // Limpiar el tracking de la entidad si existe
                var existingEntry = _context.ChangeTracker
                    .Entries<Game>()
                    .FirstOrDefault(e => e.Entity.Id == game.Id);

                if (existingEntry != null)
                {
                    existingEntry.State = EntityState.Detached;
                }

                // Obtener una nueva instancia del juego
                var existingGame = await _context.Games.FindAsync(game.Id);
                if (existingGame == null)
                {
                    throw new Exception($"Game {game.Id} not found");
                }

                // Actualizar todas las propiedades
                existingGame.Player2Id = game.Player2Id;
                existingGame.Status = game.Status;
                existingGame.LastUpdated = game.LastUpdated;
                existingGame.Player1Position = game.Player1Position;
                existingGame.Player2Position = game.Player2Position;
                existingGame.IsPlayer1Turn = game.IsPlayer1Turn;
                existingGame.Winner = game.Winner;

                // Guardar cambios
                await _context.SaveChangesAsync();

                // Actualizar el objeto original con los datos actualizados
                game.Player2Id = existingGame.Player2Id;
                game.Status = existingGame.Status;
                game.Player1Position = existingGame.Player1Position;
                game.Player2Position = existingGame.Player2Position;
                game.IsPlayer1Turn = existingGame.IsPlayer1Turn;
                game.Winner = existingGame.Winner;

                Console.WriteLine($"Game {game.Id} updated successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating game: {ex.Message}");
                throw;
            }
        }

        public async Task<List<Game>> GetActiveGamesAsync()
        {
            return await _context.Games
                .AsNoTracking()
                .Where(g => g.Status != GameStatus.Finished)
                .OrderByDescending(g => g.LastUpdated)
                .Take(20)
                .ToListAsync();
        }

        public async Task<Game> CreateAsync(Game game)
        {
            await _context.Games.AddAsync(game);
            await _context.SaveChangesAsync();
            return game;
        }

        
        
    }
}