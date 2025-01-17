namespace BackendOcago.Models.Dtos;

public class UserDto
{
    public long Id { get; set; }
    public required string Mail { get; set; }
    public required string Nickname { get; set; }
    public string Password { get; set; }
    public required string Role { get; set; }
    public string AvatarUrl { get; set; }
}