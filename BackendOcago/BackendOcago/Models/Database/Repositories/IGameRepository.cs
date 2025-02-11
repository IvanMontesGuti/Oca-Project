using BackendOcago.Models.Database.Entities;

namespace BackendOcago.Models.Database.Repositories
{
    public interface IGameRepository
    {
        Task<Game> GetByIdAsync(Guid id);
        Task<List<Game>> GetActiveGamesAsync();
        Task<Game> CreateAsync(Game game);
        Task UpdateAsync(Game game);
    }
}
