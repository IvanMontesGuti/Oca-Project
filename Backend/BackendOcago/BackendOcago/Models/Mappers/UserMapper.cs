using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Dtos;

namespace BackendOcago.Models.Mappers;

public class UserMapper
{

    public UserMapper()
    {
        
    }

    //TO DTO
    public UserDto ToDto(User user)
    {
        return new UserDto()
        {
            Id = user.Id,
            Mail = user.Mail,
            Nickname = user.Nickname,
            Role = user.Role,
            Avatar = user.Avatar
            
        };
    }

    public IEnumerable<UserDto> ToDto(IEnumerable<User> users)
    {
        return users.Select(ToDto);
    }


    //TO ENTITY
    public User ToEntity(UserDto user)
    {
        return new User
        {
            Id = user.Id,
            Mail = user.Mail,
            Nickname = user.Nickname,
            Role = user.Role,
            Avatar = user.Avatar
        };
    }

    public IEnumerable<User> ToEntity(IEnumerable<UserDto> users)
    {
        return users.Select(ToEntity);
    }

}
