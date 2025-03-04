using BackendOcago.Models.Database.Enum;
using BackendOcago.Models.Dtos;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations.Schema;

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
    public List<User> Friends { get; set; } = new(); 

    public List<Game> Games { get; set; } = new();  
    // Relaciones
    [InverseProperty("Sender")]
    public List<Friendship> SentFriendships { get; set; } = new();  // Relaciones enviadas

    [InverseProperty("Receiver")]
    public List<Friendship> ReceivedFriendships { get; set; } = new();  // Relaciones recibidas

}
