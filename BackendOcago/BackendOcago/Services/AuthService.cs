﻿using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Security.Cryptography;
using BackendOcago.Models.Dtos;

namespace BackendOcago.Services;

public class AuthService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly TokenValidationParameters _tokenParameters;
    private readonly UserService _userService;

    public AuthService(UnitOfWork unitOfWork, IOptionsMonitor<JwtBearerOptions> jwtOptions, UserService userService)
    {
        _unitOfWork = unitOfWork;
        _tokenParameters = jwtOptions.Get(JwtBearerDefaults.AuthenticationScheme)
        .TokenValidationParameters;
        _userService = userService;
    }

    public async Task<string> Login(Models.Dtos.LoginRequest model)
    {
        User user;
        if (await _unitOfWork.UserRepository.GetByMailAsync(model.Mail) == null)
        {
            user = await _unitOfWork.UserRepository.GetByNicknameAsync(model.Mail);
        }
        else
        {
            user =  await _unitOfWork.UserRepository.GetByMailAsync(model.Mail);
        }

        SecurityTokenDescriptor tokenDescriptor = new SecurityTokenDescriptor
        {
            //Se añaden los datos necesarios para autorizar al usuario
            Claims = new Dictionary<string, object>
            {
                { "id", user.Id },
                { ClaimTypes.Email, model.Mail },
                { ClaimTypes.Role, user.Role },
                { ClaimTypes.Name, user.Nickname },
                { ClaimTypes.Surname, user.AvatarUrl },


            },

            //Caducidad del token
            Expires = DateTime.UtcNow.AddHours(1),

            //Especificación de la clave y el algoritmo de firmado
            SigningCredentials = new SigningCredentials(
            _tokenParameters.IssuerSigningKey,
            SecurityAlgorithms.HmacSha256Signature)
        };

        //Se crea token y se devuelve al usuario logeado
        JwtSecurityTokenHandler tokenHandler = new JwtSecurityTokenHandler();
        SecurityToken token = tokenHandler.CreateToken(tokenDescriptor);
        string stringToken = tokenHandler.WriteToken(token);

        return stringToken;
    }

    public async Task<string> Register(RegisterRequest userRequest)
    {

        LoginRequest model = new LoginRequest
        {
            Mail = userRequest.Mail,
            Password = userRequest.Password,
        };

        await _userService.InsertByMailAsync(userRequest);

        return await Login(model);
    }

    /* OTROS MÉTODOS */
    public static string HashPassword(string password)
    {
        byte[] inputBytes = Encoding.UTF8.GetBytes(password);
        byte[] inputHash = SHA256.HashData(inputBytes);
        return Encoding.UTF8.GetString(inputHash);
    }

}
