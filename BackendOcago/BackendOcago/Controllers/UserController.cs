﻿// Controlador
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
    public async Task<IActionResult> UpdateUser([FromBody] UserDto userDto)
    {
        var updatedUser = await _userService.UpdateAsync(userDto);
        return Ok(updatedUser);
    }

}
