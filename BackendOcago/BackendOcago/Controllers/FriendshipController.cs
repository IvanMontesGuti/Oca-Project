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
            if (requests == null)
            {
                return NotFound("No se encontraron solicitudes de amistad recibidas.");
            }
            else
            {
                return Ok(requests.ToList());
            }
            
        }


        [HttpPost("accept/{friendshipId}")]
        public async Task<IActionResult> AcceptRequest(long friendshipId, long userId)
        {
            var success = await _friendshipService.AcceptFriendRequestAsync(friendshipId, userId);
            if (!success) return BadRequest("Solicitud no encontrada, ya gestionada o los usuarios no son válidos.");

            return Ok("Solicitud aceptada. Los usuarios ahora son amigos.");
        }

        [HttpPost("reject/{friendshipId}")]
        public async Task<IActionResult> RejectRequest(long friendshipId, long userId)
        {
            var success = await _friendshipService.RejectFriendRequestAsync(friendshipId, userId);
            if (!success) return BadRequest("Solicitud no encontrada o ya gestionada.");

            return Ok("Solicitud rechazada.");
        }

        [HttpDelete("remove/{userId}/{friendId}")]
        public async Task<IActionResult> RemoveFriend(long userId, long friendId)
        {
            if (userId <= 0 || friendId <= 0)
                return BadRequest("IDs de usuario y amigo deben ser válidos.");

            var success = await _friendshipService.RemoveFriendAsync(userId, friendId);
            if (!success)
                return BadRequest("No se pudo eliminar la amistad. Verifica que la relación de amistad exista.");

            return Ok("Amigo eliminado con éxito.");
        }



        // Endpoint para obtener todas las solicitudes de amistad
        [HttpGet("all/")]
        public async Task<IActionResult> GetAllRequests()
        {
            var requests = await _friendshipService.GetAllFriendshipRequestsAsync();
            if (requests == null || !requests.Any())
                return NotFound("No se encontraron solicitudes de amistad.");

            return Ok(requests);
        }

        [HttpGet("all/{userId}")]
        public async Task<IActionResult> GetAllFriends(long userId)
        {
            var friends = await _friendshipService.GetAllFriendshipsAsync(userId);
            if (friends == null || !friends.Any())
                return NotFound("No se encontraron amistades.");

            return Ok(friends);
        }
    }
}
