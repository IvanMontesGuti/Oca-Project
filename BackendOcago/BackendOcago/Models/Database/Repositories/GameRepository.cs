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
            // Usar Include para asegurarnos de cargar todas las relaciones necesarias
            var game = await _context.Games
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == id);

            Console.WriteLine($"GetByIdAsync - Game {id}: Player2Id={game?.Player2Id}, Status={game?.Status}");
            return game;
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

        public async Task newUpdateAsync(Game game)
        {
            try
            {
                // Obtener una nueva instancia del contexto para esta operación
                var existingGame = await _context.Games.FindAsync(game.Id);
                if (existingGame == null)
                {
                    throw new Exception($"Game {game.Id} not found");
                }

                // Actualizar manualmente cada propiedad
                existingGame.Player2Id = game.Player2Id;
                existingGame.Status = game.Status;
                existingGame.LastUpdated = game.LastUpdated;
                existingGame.Player1Position = game.Player1Position;
                existingGame.Player2Position = game.Player2Position;
                existingGame.IsPlayer1Turn = game.IsPlayer1Turn;
                existingGame.Winner = game.Winner;

                // Marcar la entidad como modificada
                _context.Entry(existingGame).State = EntityState.Modified;

                Console.WriteLine($"Updating game {game.Id}:");
                Console.WriteLine($"Player2Id: {existingGame.Player2Id}");
                Console.WriteLine($"Status: {existingGame.Status}");

                // Guardar cambios
                await _context.SaveChangesAsync();

                // Verificar la actualización
                var updatedGame = await _context.Games
                    .AsNoTracking()
                    .FirstOrDefaultAsync(g => g.Id == game.Id);

                Console.WriteLine($"After update - Game {game.Id}:");
                Console.WriteLine($"Player2Id: {updatedGame?.Player2Id}");
                Console.WriteLine($"Status: {updatedGame?.Status}");

                // Actualizar el objeto original con los datos actualizados
                game.Player2Id = updatedGame?.Player2Id;
                game.Status = updatedGame?.Status ?? game.Status;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating game: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                throw;
            }
        }
    }
}