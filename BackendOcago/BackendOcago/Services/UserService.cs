using BackendOcago.Models.Database.Entities;
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

    //public async Task<UserDto> UpdateAvatarAsync(long userId, string base64Image)
    //{
    //    User user = await _unitOfWork.UserRepository.GetByIdAsync(userId) ?? throw new Exception("El usuario especificado no existe");

    //    user.Avatar = base64Image;
    //    _unitOfWork.UserRepository.Update(user);
    //    await _unitOfWork.SaveAsync();

    //    return _mapper.ToDto(user);
    //}

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
        // Normalizamos el nickname y el correo para compararlos de manera insensible a mayúsculas/minúsculas.
        string normalizedMail = userRequest.Mail.Trim().ToLower();
        string normalizedNickname = userRequest.Nickname.Trim().ToLower();

        // Comprobamos si el correo ya está en uso.
        if (await _unitOfWork.UserRepository.GetByMailAsync(normalizedMail) != null)
        {
            throw new Exception("El correo ya está en uso");
        }

        // Comprobamos si el nickname ya está en uso.
        if ((await _unitOfWork.UserRepository.GetAllAsync())
            .Any(u => u.Nickname.Trim().ToLower() == normalizedNickname))
        {
            throw new Exception("El nickname ya está en uso");
        }

        // Creación del nuevo usuario.
        User newUser = new User
        {
            Mail = normalizedMail,
            Password = AuthService.HashPassword(userRequest.Password),
            Nickname = userRequest.Nickname, // Almacenamos el nickname tal como lo ingresó el usuario.
            Role = null,
            AvatarUrl = userRequest.AvatarUrl
        };

        return _mapper.ToDto(await InsertAsync(newUser));
    }




    /* ----- UPDATE ----- */

    public async Task<UserDto> UpdateAsync(UserDto user)
    {
        User userEntity = await _unitOfWork.UserRepository.GetByIdAsync(user.Id) ?? throw new Exception("El usuario especificado no existe");

        userEntity.Mail = user.Mail;
        userEntity.Nickname = user.Nickname;
        userEntity.AvatarUrl = user.AvatarUrl;

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
    public async Task<int> GetStatusCount (UserStatus status)
    {
        return await _unitOfWork.UserRepository.CountStatusAsync(status);
    }
    public async Task<UserDto> UpdateStatus(UserStatus Status, long userId)
    {
        var userEntity = await _unitOfWork.UserRepository.GetByIdAsync(userId);
        if (userEntity == null) throw new Exception("El usuario no existe");

        userEntity.Status = Status;
        _unitOfWork.UserRepository.Update(userEntity);

        var affectedRows = await _unitOfWork.SaveAsync();

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