using BackendOcago.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackendOcago.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GameController : ControllerBase
    {
        private readonly GameService _gameService;

        // Inject GameService into the controller
        public GameController(GameService gameService)
        {
            _gameService = gameService;
        }

        // Endpoint to start the game and play
        [HttpPost("start")]
        public IActionResult StartGame()
        {
            try
            {
                var result = _gameService.JugarTurnos();
                return Ok(result); // Return the result of the game as a JSON object
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Endpoint to get the current status of the game (Optional)
        [HttpGet("status")]
        public IActionResult GetGameStatus()
        {
            // For the sake of example, we'll assume you have a method to get the game status.
            // You may want to refactor the `GameService` to keep track of the game state and return it.
            return Ok(new
            {
                // For demonstration, returning static values, adapt this to your actual game logic
                ficha1 = 0,
                ficha2 = 0,
                turnoNum = 1,
                mensaje = "Game in progress"
            });
        }
    }
}