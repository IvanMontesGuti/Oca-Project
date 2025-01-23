using BackendOcago.Models.Database.Enum;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database.Entities;

[Index(nameof(Mail), IsUnique = true)]
[Index(nameof(Nickname), IsUnique = true)]
public class User
{
    public long Id { get; set; }
    public required string Mail { get; set; }
    public required string Nickname { get; set; }
    public string Password { get; set; }
    public required string Role { get; set; }
    public string AvatarUrl { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Desconectado;

    public List<Friendship> SentFriendships { get; set; } = new List<Friendship>();
    public List<Friendship> ReceivedFriendships { get; set; } = new List<Friendship>();
    
}
