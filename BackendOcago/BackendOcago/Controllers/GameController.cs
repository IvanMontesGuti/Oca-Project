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
        public async Task<ActionResult<GameDTO>> CreateGame()
        {
            var playerId = User.Identity.Name;
            var game = await _gameService.CreateGameAsync(playerId);
            return Ok(game);
        }

        [HttpPost("{gameId}/join")]
        public async Task<ActionResult<GameDTO>> JoinGame(Guid gameId)
        {
            var playerId = User.Identity.Name;
            var game = await _gameService.JoinGameAsync(gameId, playerId);
            return Ok(game);
        }

        [HttpPost("{gameId}/move")]
        public async Task<ActionResult<GameMoveDTO>> MakeMove(Guid gameId)
        {
            var playerId = User.Identity.Name;
            var move = await _gameService.MakeMoveAsync(gameId, playerId);
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