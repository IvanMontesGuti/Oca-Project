using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;

namespace BackendOcago.Models.Dtos;

public class UserDto
{
    public long Id { get; set; }
    public required string Mail { get; set; }
    public required string Nickname { get; set; }
    public string Password { get; set; }
    public required string Role { get; set; }
    public string AvatarUrl { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Desconectado;
    public List<User> Friends { get; set; } = new ();

    public List<Game> Games { get; set; } = new();  // Partidas

    public List<Friendship> SentFriendships { get; set; } = new ();  // Relaciones enviadas
    public List<Friendship> ReceivedFriendships { get; set; } = new ();  // Relaciones recibidas


}