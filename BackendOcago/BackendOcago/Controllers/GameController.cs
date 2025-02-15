using BackendOcago.Models.Dtos;
using BackendOcago.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackendOcago.Controllers
{
    
    [ApiController]
    [Route("api/[controller]")]
    public class GameController : ControllerBase
    {
        private readonly IGameService _gameService;

        public GameController(IGameService gameService)
        {
            _gameService = gameService;
        }

        [HttpPost]
        public async Task<ActionResult<GameDTO>> CreateGame(String userId)
        {
            var game = await _gameService.CreateGameAsync(userId);
            return Ok(game);
        }

        [HttpPost("{gameId}/join")]
        public async Task<ActionResult<GameDTO>> JoinGame(Guid gameId, string UserId)
        {
            var game = await _gameService.JoinGameAsync(gameId, UserId);
            return Ok(game);
        }

        [HttpPost("{gameId}/move")]
        public async Task<ActionResult<GameMoveDTO>> MakeMove(Guid gameId, string UserId)
        {
            
            var move = await _gameService.MakeMoveAsync(gameId, UserId);
            return Ok(move);
        }

        [HttpGet("{gameId}")]
        public async Task<ActionResult<GameDTO>> GetGame(Guid gameId)
        {
            var game = await _gameService.GetGameAsync(gameId);
            return Ok(game);
        }

        [HttpGet]
        public async Task<ActionResult<List<GameDTO>>> GetActiveGames()
        {
            var games = await _gameService.GetActiveGamesAsync();
            return Ok(games);
        }
    }
}