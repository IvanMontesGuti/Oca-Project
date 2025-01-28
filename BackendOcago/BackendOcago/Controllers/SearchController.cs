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
    public async Task<IActionResult> SearchUsers([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest("La consulta de búsqueda no puede estar vacía.");
        }

        try
        {
            // Traer los usuarios como Enumerable para procesarlos en memoria
            var users = _context.Users.AsEnumerable().ToList(); // Cambié a ToList()

            // Realizar la búsqueda en memoria
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
}
