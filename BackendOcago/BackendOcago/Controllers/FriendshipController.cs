using BackendOcago.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BackendOcago.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FriendshipController : ControllerBase
    {
        private readonly FriendshipService _friendshipService;

        public FriendshipController(FriendshipService friendshipService)
        {
            _friendshipService = friendshipService;
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendRequest(long senderId, long receiverId)
        {
            var success = await _friendshipService.SendFriendRequestAsync(senderId, receiverId);
            if (!success) return BadRequest("La solicitud ya existe o la amistad ya fue aceptada.");

            return Ok("Solicitud enviada con éxito.");
        }

        [HttpGet("received/{userId}")]
        public async Task<IActionResult> GetReceivedRequests(long userId)
        {
            if (userId <= 0) return BadRequest("El ID del usuario debe ser válido.");

            var requests = await _friendshipService.GetReceivedRequestsAsync(userId);
            if (requests == null) return NotFound("No se encontraron solicitudes de amistad recibidas.");

            return Ok(requests);
        }


        [HttpPost("accept/{friendshipId}")]
        public async Task<IActionResult> AcceptRequest(long friendshipId, long userId)
        {
            var success = await _friendshipService.AcceptFriendRequestAsync(friendshipId, userId);
            if (!success) return BadRequest("Solicitud no encontrada o ya gestionada.");

            return Ok("Solicitud aceptada.");
        }


        // Endpoint para obtener todas las solicitudes de amistad
        [HttpGet("all/{userId}")]
        public async Task<IActionResult> GetAllRequests(long userId)
        {
            var requests = await _friendshipService.GetAllFriendshipRequestsAsync(userId);
            if (requests == null || !requests.Any())
                return NotFound("No se encontraron solicitudes de amistad.");

            return Ok(requests);
        }
    }
}
