// Controlador
using Microsoft.AspNetCore.Mvc;
using BackendOcago.Services;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly UserService _userService;

    public UserController(UserService userService)
    {
        _userService = userService;
    }

    // Endpoint para obtener todos los usuarios registrados
    [HttpGet("all")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(long id)
    {
        var user = await _userService.GetByIdAsync(id);
        return Ok(user);
    }

    [HttpGet("Get/{nickname}")]
    public async Task<IActionResult> GetByNickname(string nickname)
    {
        var user = await _userService.GetByNickNameAsync(nickname);
        return Ok(user);
    }

    [HttpPut("Status")]
    public async Task<UserDto> ChangeStatus(UserStatus userStatusRequest, long userId)
    {
        return await _userService.UpdateStatus(userStatusRequest, userId);
    }

    [HttpGet("CountStatus")]
    public async Task<int> GetStatusCount (UserStatus estado)
    {
        return await _userService.GetStatusCount(estado);
    }

    [HttpPut("Update")]
    public async Task<IActionResult> UpdateUser(long userId, string newMail, string newNickname)
    {
        var updatedUser = await _userService.UpdateUserAsync(userId, newMail, newNickname);
        return Ok(updatedUser);
    }

    [HttpPut("ChangePassword")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePassword changePassword)
    {
        try
        {
            bool result = await _userService.ChangePasswordAsync(changePassword.UserId, changePassword.OldPassword, changePassword.NewPassword);
            if (result) {
                return Ok("La contraseña se ha cambiado correctamente!");
            }
            else
            {
                return BadRequest("No se pudo cambiar la contraseña.");
            }
        }
        catch(Exception ex) 
        {
            return BadRequest(ex.Message);
        }
    }
    [HttpGet("History")]
    public async Task<IActionResult> GetGameHistory(long userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        return Ok(user.Games);
    }

}
