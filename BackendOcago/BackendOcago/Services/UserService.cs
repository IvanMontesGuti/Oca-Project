﻿using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using BackendOcago.Models.Database.Enum;
namespace BackendOcago.Services;

public class UserService
{
    private readonly UnitOfWork _unitOfWork;
    private readonly UserMapper _mapper;


    public UserService(UnitOfWork unitOfWork, UserMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        
    }


    /* ----- GET ----- */

    public async Task<UserDto> GetByIdAsync(long id)
    {
        User user = await _unitOfWork.UserRepository.GetUserDataByIdAsync(id);
        return _mapper.ToDto(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        IEnumerable<User> users = await _unitOfWork.UserRepository.GetAllAsync();
        return _mapper.ToDto(users);
    }


    /* ----- INSERT ----- */

    public async Task<User> InsertAsync(User user)
    {
        await _unitOfWork.UserRepository.InsertAsync(user);
        await _unitOfWork.SaveAsync();

        return user;
    }

    public async Task<UserDto> InsertByMailAsync(RegisterRequest userRequest)
    {
        string normalizedMail = userRequest.Mail.Trim().ToLower();
        string normalizedNickname = userRequest.Nickname.Trim().ToLower();

        if (await _unitOfWork.UserRepository.GetByMailAsync(normalizedMail) != null)
        {
            throw new Exception("El correo ya está en uso");
        }

        if ((await _unitOfWork.UserRepository.GetAllAsync())
            .Any(u => u.Nickname.Trim().ToLower() == normalizedNickname))
        {
            throw new Exception("El nickname ya está en uso");
        }

        string defaultRole = string.IsNullOrEmpty(userRequest.Role) ? "User" : userRequest.Role;

        User newUser = new User
        {
            Mail = normalizedMail,
            Password = AuthService.HashPassword(userRequest.Password),
            Nickname = userRequest.Nickname, 
            Role = defaultRole,
            AvatarUrl = userRequest.AvatarUrl
        };

        var insertedUser = await InsertAsync(newUser);
        return _mapper.ToDto(insertedUser);
    }




    /* ----- UPDATE ----- */
    public async Task<UserDto> UpdateRoleAsync(long userId,  string roleChanged)
    {
        var userEntity = await _unitOfWork.UserRepository.GetByIdAsync(userId) ?? throw new Exception("El usuario especificado no existe");

        userEntity.Role = roleChanged;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }
    public async Task<UserDto> UpdateAsync(UserDto userDto)
    {
        var userEntity = await _unitOfWork.UserRepository.GetByIdAsync(userDto.Id) ?? throw new Exception("El usuario especificado no existe");

        userEntity.Mail = userDto.Mail;
        userEntity.Nickname = userDto.Nickname;
        userEntity.AvatarUrl = userDto.AvatarUrl;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }

    public async Task<UserDto> UpdateUserAsync(long userId, string newMail, string newNickname)
    {
        var userEntity = await _unitOfWork.UserRepository.GetByIdAsync(userId) ?? throw new Exception("El usuario especificado no existe");
        
        string oldNickname = userEntity.Nickname;
        string newAvatarUrl = "images/" + newNickname + ".png";

        userEntity.Mail = newMail;
        userEntity.Nickname = newNickname;
   
        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }

    public async Task<bool> ChangePasswordAsync(long userId, string oldPassword, string newPassword)
    {
        var user = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (user == null)
        {
            throw new Exception("El usuario no existe");
        }

        var hashedOldPassword = AuthService.HashPassword(oldPassword);
        if (user.Password != hashedOldPassword)
        {
            throw new Exception("Contraseña incorrecta");
        }

        user.Password = AuthService.HashPassword(newPassword);

        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveAsync();

        return true;
    }

    public async Task<List<Game>> GetAllMatchesAsync(long receiverId)
    {
        var allGames = await _unitOfWork.GameRepository.GetAllAsync();
        string receiverIdString = receiverId.ToString();

        return allGames
            .Where(f => f.Player1Id == receiverIdString || f.Player2Id == receiverIdString)
            .ToList();
    }

    public async Task<int> GetStatusCount (UserStatus status)
    {
        return await _unitOfWork.UserRepository.CountStatusAsync(status);
    }
    public async Task<UserDto> UpdateStatus(UserStatus newStatus, long userId)
    {
        var userEntity = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (userEntity == null) throw new Exception("El usuario no existe");

        userEntity.Status = newStatus;
        _unitOfWork.UserRepository.Update(userEntity);
        Console.WriteLine($"Usuario {userId} actualizado a estado {newStatus}");


        var affectedRows = await _unitOfWork.SaveAsync();
        Console.WriteLine($"Filas afectadas en la DB: {affectedRows}");


        return _mapper.ToDto(userEntity);
    }


    /* ----- DELETE ----- */

    public async Task<bool> DeleteAsyncUserById(long id)
    {
        User user = await _unitOfWork.UserRepository.GetByIdAsync(id);
        _unitOfWork.UserRepository.Delete(user);

        return await _unitOfWork.SaveAsync();
    }


    /* ----- FUNCIONES PRIVADAS ----- */

    public Task<bool> IsLoginCorrect(string mail, string password)
    {
        string hashedPassword = AuthService.HashPassword(password);
        return _unitOfWork.UserRepository.IsLoginCorrect(mail.Normalize(), hashedPassword);
    }

    public Task<User> GetByMailAsync(string mail)
    {
        return _unitOfWork.UserRepository.GetByMailAsync(mail);
    }
    public Task<User> GetByNickNameAsync(string mail)
    {
        return _unitOfWork.UserRepository.GetByNicknameAsync(mail);
    }
}