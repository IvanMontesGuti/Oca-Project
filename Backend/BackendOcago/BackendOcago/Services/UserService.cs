using System;
using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database;
using BackendOcago.Models.Dtos;
using BackendOcago.Models.Mappers;
using System.Net;
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

    public async Task<UserDto> UpdateAvatarAsync(long userId, string base64Image)
    {
        User user = await _unitOfWork.UserRepository.GetByIdAsync(userId) ?? throw new Exception("El usuario especificado no existe");

        user.Avatar = base64Image;
        _unitOfWork.UserRepository.Update(user);
        await _unitOfWork.SaveAsync();

        return _mapper.ToDto(user);
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
        

        User newUser = new User
        {
            Mail = userRequest.Mail,
            Password = AuthService.HashPassword(userRequest.Password),
            Nickname = userRequest.Nickname,
            Role = null,
            Avatar = userRequest.Avatar
        };

        return _mapper.ToDto(await InsertAsync(newUser));
    }
    


    /* ----- UPDATE ----- */

    public async Task<UserDto> UpdateAsync(UserDto user)
    {
        User userEntity = await _unitOfWork.UserRepository.GetByIdAsync(user.Id) ?? throw new Exception("El usuario especificado no existe");

        userEntity.Mail = user.Mail;
        userEntity.Nickname = user.Nickname;
        userEntity.Avatar = user.Avatar;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }

    /*
    public async Task<UserDto> UpdateRole(HandleRole handleRole)
    {
        User userEntity = await _unitOfWork.UserRepository.GetByIdAsync(handleRole.UserId) ?? throw new Exception("El usuario no existe");
        userEntity.Role = handleRole.Role;

        _unitOfWork.UserRepository.Update(userEntity);

        await _unitOfWork.UserRepository.SaveAsync();

        return _mapper.ToDto(userEntity);
    }
    */

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
        return _unitOfWork.UserRepository.IsLoginCorrect(mail.ToLowerInvariant(), hashedPassword);
    }

    public Task<User> GetByMailAsync(string mail)
    {
        return _unitOfWork.UserRepository.GetByMailAsync(mail);
    }
}