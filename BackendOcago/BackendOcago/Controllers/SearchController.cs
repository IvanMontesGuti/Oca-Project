using BackendOcago.Models.Database;
using BackendOcago.Services;
using Microsoft.AspNetCore.Mvc;

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

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string query, [FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest("La consulta de búsqueda no puede estar vacía.");
        }

        try
        {
            // Calcular el salto y la cantidad de usuarios a traer según la paginación
            var skip = (page - 1) * limit;

            // Filtrar y buscar usuarios
            var usersQuery = _context.Users.AsQueryable();
            var filteredUsers = await _searchService.SearchUsersAsync(usersQuery, query);

            // Paginar los resultados
            var paginatedUsers = filteredUsers.Skip(skip).Take(limit).ToList();

            // Calcular el total de páginas
            var totalUsers = filteredUsers.Count();
            var totalPages = (int)Math.Ceiling(totalUsers / (double)limit);

            if (!paginatedUsers.Any())
            {
                return NotFound("No se encontraron usuarios que coincidan con la consulta.");
            }

            // Devolver los resultados junto con la paginación
            return Ok(new
            {
                friends = paginatedUsers,
                totalPages
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Ocurrió un error al realizar la búsqueda: {ex.Message}");
        }
    }
}
