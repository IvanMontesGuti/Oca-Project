using BackendOcago.Models.Dtos;

namespace BackendOcago.Services
{
    public interface IGameService
    {
        Task<GameDTO> CreateGameAsync(string player1Id);
        Task<GameDTO> JoinGameAsync(Guid gameId, string player2Id);
        Task<GameDTO> GetGameAsync(Guid gameId);
        Task<GameMoveDTO> MakeMoveAsync(Guid gameId, string playerId);
        Task<List<GameDTO>> GetActiveGamesAsync();
    }
}
