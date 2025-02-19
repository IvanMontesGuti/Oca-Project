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
            var game = await _context.Games
                .AsNoTracking() // Evitar el tracking para obtener datos frescos
                .FirstOrDefaultAsync(g => g.Id == id);

            _context.Entry(game).State = EntityState.Detached;
            return game;
        }

        public async Task UpdateAsync(Game game)
        {
            _context.Entry(game).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task<List<Game>> GetActiveGamesAsync()
        {
            return await _context.Games
                .Where(g => g.Status != GameStatus.Finished)
                .OrderByDescending(g => g.LastUpdated)
                .Take(20)
                .ToListAsync();
        }

        public async Task<Game> CreateAsync(Game game)
        {
            _context.Games.Add(game);
            await _context.SaveChangesAsync();
            return game;
        }

        /*
        public async Task UpdateAsync(Game game)
        {
            _context.Entry(game).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }
        */

        public async Task newUpdateAsync(Game game)
        {
            _context.Games.Update(game);
            Console.WriteLine("Juego Actualizado"+game);
            await _context.SaveChangesAsync();
            Console.WriteLine("SAVES"+ game);
            // Asegura que los cambios se persisten en la base de datos
        }

    }
}
