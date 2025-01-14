using BackendOcago.Models.Database.Entities;
using eCommerce.Models.Database.Entities;
using eCommerce.Services;
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
                Name = "Yasir",
                Surname = "Bel Maalem Ouhadou Abdenour",
                Phone = 123456789,
                Role = "admin"
            },
            new User {
                Mail = "ivan@gmail.es",
                Password = AuthService.HashPassword("Ivan#123456789") ,
                Name = "Ivan",
                Surname = "Montes Gutierrez",
                Phone = 123456789,
                Role = "admin"
            },
            new User {
                Mail = "jose@gmail.es",
                Password = AuthService.HashPassword("Jose#123456789"),
                Name = "José",
                Surname = "Santos Garrido",
                Phone = 123456789,
                Role = "admin"
            }
        ];

        //Users

        await _dbContext.Users.AddRangeAsync(users);
        await _dbContext.SaveChangesAsync();

    }
}