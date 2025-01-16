using BackendOcago.Models.Database.Entities;
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
        [
            
            new User {
                Mail = "yasir@gmail.es",
                Password = AuthService.HashPassword("Yasir#123456789") ,
                Nickname = "Yasir",
                Role = "admin"
            },
            new User {
                Mail = "ivan@gmail.es",
                Password = AuthService.HashPassword("Ivan#123456789") ,
                Nickname = "Ivan",
                Role = "admin"
            },
            new User {
                Mail = "jose@gmail.es",
                Password = AuthService.HashPassword("Jose#123456789"),
                Nickname = "José",
                Role = "admin"
            }
        ];

        //Users

        await _dbContext.Users.AddRangeAsync(users);
        await _dbContext.SaveChangesAsync();

    }
}