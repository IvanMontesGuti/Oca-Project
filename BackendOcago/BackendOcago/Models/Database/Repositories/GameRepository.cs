using BackendOcago.Models.Database.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database.Repositories
{
    public class GameRepository : IGameRepository
    {
        private readonly DataContext _context;

        public GameRepository(DataContext context)
        {
            _context = context;
        }

        public async Task<Game> GetByIdAsync(Guid id)
        {
            return await _context.Games.FindAsync(id);
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

        public async Task UpdateAsync(Game game)
        {
            _context.Entry(game).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }
    }
}
