using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using BackendOcago.Services;
using System.Net;
using System.Text.Json;

namespace BackendOcago.Models.Database;

public class Seeder
{
    private readonly DataContext _dbContext;

    public Seeder(DataContext context)
    {
        _dbContext = context;
    }

    public async Task SeedAsync()
    {
        await Seed();
        await _dbContext.SaveChangesAsync();
    }

    private async Task Seed()
    {
        /* ----- USERS ----- */

        User[] users =
               {
            new User
            {
                Mail = "yasir@gmail.es",
                Password = AuthService.HashPassword("Yasir#123456789"),
                Nickname = "Yasir",
                Role = "admin",
                AvatarUrl = "images/Yasir.png",
                Status = Enum.UserStatus.Desconectado,
                ReceivedFriendships = new List<Friendship>(), 
                SentFriendships = new List<Friendship>()     
            },
            new User
            {
                Mail = "ivan@gmail.es",
                Password = AuthService.HashPassword("Ivan#123456789"),
                Nickname = "Ivan",
                Role = "admin",
                AvatarUrl = "images/Ivan.png",
                ReceivedFriendships = new List<Friendship>(),  
                SentFriendships = new List<Friendship>()      
            },
            new User
            {
                Mail = "jose@gmail.es",
                Password = AuthService.HashPassword("Jose#123456789"),
                Nickname = "José",
                Role = "admin",
                AvatarUrl = "images/José.png",
                ReceivedFriendships = new List<Friendship>(),  
                SentFriendships = new List<Friendship>()      
            }
        };
        //Users
        await _dbContext.Users.AddRangeAsync(users);
        await _dbContext.SaveChangesAsync();

        //Friendship friendship = new Friendship
        //{
        //    SenderId = users[1].Id, 
        //    ReceiverId = users[2].Id, 
        //    SentAt = DateTime.UtcNow,
        //    Status = FriendshipInvitationStatus.Pendiente
        //};
        ////Amistades
        //await _dbContext.Friendships.AddAsync(friendship);
        //await _dbContext.SaveChangesAsync();




    }
}