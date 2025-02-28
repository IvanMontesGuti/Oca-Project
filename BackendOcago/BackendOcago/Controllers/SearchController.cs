using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Enum;
using BackendOcago.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchController : ControllerBase
    {
        private readonly SmartSearchService _searchService;
        private readonly DataContext _context;

        public SearchController(SmartSearchService searchService, DataContext context)
        {
            _searchService = searchService;
            _context = context;
        }

        // Endpoint para buscar entre TODOS los usuarios
        [HttpGet("users")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("La consulta de búsqueda no puede estar vacía.");
            }

            try
            {
                // Materializamos la consulta para evaluar en memoria
                var users = await _context.Users.ToListAsync();
                var searchResults = await _searchService.SearchUsersAsync(users.AsQueryable(), query);

                if (!searchResults.Any())
                {
                    return NotFound("No se encontraron usuarios que coincidan con la consulta.");
                }

                return Ok(searchResults);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ocurrió un error al realizar la búsqueda: {ex.Message}");
            }
        }

        // Endpoint para buscar en la lista de AMIGOS del usuario
        [HttpGet("friends")]
        public async Task<IActionResult> SearchFriends([FromQuery] string query, [FromQuery] long userId)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("La consulta de búsqueda no puede estar vacía.");
            }

            try
            {
                // Obtenemos los IDs de amigos (asumiendo que el status "Aceptada" representa amistad aceptada)
                var friendIds = await _context.Friendships
                    .Where(f => f.Status == FriendshipInvitationStatus.Aceptada && (f.SenderId == userId || f.ReceiverId == userId))
                    .Select(f => f.SenderId == userId ? f.ReceiverId : f.SenderId)
                    .ToListAsync();

                // Materializamos la consulta de amigos
                var friendsList = await _context.Users
                    .Where(u => friendIds.Contains(u.Id))
                    .ToListAsync();

                var searchResults = await _searchService.SearchUsersAsync(friendsList.AsQueryable(), query);

                if (!searchResults.Any())
                {
                    return NotFound("No se encontraron amigos que coincidan con la consulta.");
                }

                return Ok(searchResults);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ocurrió un error al buscar en amigos: {ex.Message}");
            }
        }

        // Endpoint para buscar entre los USUARIOS que NO son amigos del usuario
        [HttpGet("nonfriends")]
        public async Task<IActionResult> SearchNonFriends([FromQuery] string query, [FromQuery] long userId)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("La consulta de búsqueda no puede estar vacía.");
            }

            try
            {
                // Obtenemos los IDs de los amigos del usuario
                var friendIds = await _context.Friendships
                    .Where(f => f.Status == FriendshipInvitationStatus.Aceptada && (f.SenderId == userId || f.ReceiverId == userId))
                    .Select(f => f.SenderId == userId ? f.ReceiverId : f.SenderId)
                    .ToListAsync();

                // Seleccionamos usuarios que no sean amigos y excluimos al propio usuario
                var nonFriendsList = await _context.Users
                    .Where(u => !friendIds.Contains(u.Id) && u.Id != userId)
                    .ToListAsync();

                var searchResults = await _searchService.SearchUsersAsync(nonFriendsList.AsQueryable(), query);

                if (!searchResults.Any())
                {
                    return NotFound("No se encontraron usuarios que coincidan con la consulta.");
                }

                return Ok(searchResults);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Ocurrió un error al buscar usuarios no amigos: {ex.Message}");
            }
        }
    }
}
