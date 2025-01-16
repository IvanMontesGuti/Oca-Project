namespace BackendOcago.Models.Dtos;

public class RegisterRequest
{
    public required string Mail { get; set; }
    public required string Nickname { get; set; }
    public string Password { get; set; }
    public required string Role { get; set; }
    public string Avatar { get; set; }
}
