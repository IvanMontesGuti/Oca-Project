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
            if (!success) return BadRequest("Solicitud ya existente o amistad ya aceptada.");
            return Ok("Solicitud enviada con éxito.");
        }

        [HttpGet("received/{userId}")]
        public async Task<IActionResult> GetReceivedRequests(long userId)
        {
            var requests = await _friendshipService.GetReceivedRequestsAsync(userId);
            return Ok(requests);
        }

        [HttpPost("accept/{friendshipId}")]
        public async Task<IActionResult> AcceptRequest(long friendshipId, long userId)
        {
            var success = await _friendshipService.AcceptFriendRequestAsync(friendshipId, userId);
            if (!success) return BadRequest("Solicitud no encontrada o ya gestionada.");
            return Ok("Solicitud aceptada.");
        }
    }

}
