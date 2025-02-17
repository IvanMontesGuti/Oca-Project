using Microsoft.AspNetCore.Mvc;
using System;
using System.Net.WebSockets;
using System.Threading.Tasks;
using BackendOcago.Services;
using BackendOcago.Models.Dtos;

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

        [HttpGet("ws/game/connect/{playerId}")]
        public async Task ConnectWebSocket(string playerId)
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
                await _gameService.HandleWebSocketAsync(webSocket, playerId);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
            }
        }

        [HttpPost("create")]
        public async Task<ActionResult<GameDTO>> CreateGame([FromQuery] string playerId)
        {
            var game = await _gameService.CreateGameAsync(playerId);
            return Ok(game);
        }

        [HttpPost("{gameId}/join")]
        public async Task<ActionResult<GameDTO>> JoinGame(Guid gameId, [FromQuery] string playerId)
        {
            var game = await _gameService.JoinGameAsync(gameId, playerId);
            return Ok(game);
        }

        [HttpGet("{gameId}")]
        public async Task<ActionResult<GameDTO>> GetGame(Guid gameId)
        {
            var game = await _gameService.GetGameAsync(gameId);
            return Ok(game);
        }

        [HttpGet("active")]
        public async Task<ActionResult<List<GameDTO>>> GetActiveGames()
        {
            var games = await _gameService.GetActiveGamesAsync();
            return Ok(games);
        }
    }
}
