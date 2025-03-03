//using BackendOcago.Models.Database;
//using BackendOcago.Models.Database.Entities;
//using BackendOcago.Services;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using System;
//using System.Linq;

//[Route("api/lobby")]
//[ApiController]
//public class LobbyController : ControllerBase
//{
//    private readonly DataContext _context;
//    private readonly LobbyService _lobbyService;

//    public LobbyController(DataContext context, LobbyService lobbyService)
//    {
//        _context = context;
//        _lobbyService = lobbyService;
//    }

//    [HttpPost("create/{userId}")]
//    public async Task<IActionResult> CrearLobby(string userId)
//    {
//        var lobbyId = await _lobbyService.CreateLobbyAsync(userId); // Llamamos al servicio para crear el lobby
//        if (lobbyId == null)
//        {
//            return BadRequest("El usuario ya está en un lobby.");
//        }

//        return CreatedAtAction(nameof(ObtenerLobbies), new { id = lobbyId }, new { lobbyId });
//    }


//    [HttpPost("{lobbyId}/agregarUsuario/{usuarioId}")]
//    public IActionResult AgregarUsuario(long lobbyId, long usuarioId)
//    {
//        var lobby = _context.Lobbies.Include(l => l.Usuarios).FirstOrDefault(l => l.Id == lobbyId);
//        if (lobby == null) return NotFound("Lobby no encontrado");

//        var usuario = _context.Users.Find(usuarioId);
//        if (usuario == null) return NotFound("Usuario no encontrado");

//        lobby.Usuarios.Add(usuario);
//        _context.SaveChanges();

//        return Ok("Usuario agregado al lobby");
//    }

//    // 3️⃣ Obtener todos los lobbies con sus usuarios
//    [HttpGet("all")]
//    public IActionResult ObtenerLobbies()
//    {
//        var lobbies = _context.Lobbies
//            .Include(l => l.Usuarios)
//            .Select(l => new
//            {
//                l.Id,
//                l.CreadoEn,
//                Usuarios = l.Usuarios.Select(u => new { u.Id, u.Nickname }).ToList()
//            }).ToList();

//        return Ok(lobbies);
//    }
//}
