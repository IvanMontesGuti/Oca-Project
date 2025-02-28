using BackendOcago.Models.Database.Entities;
﻿
using BackendOcago.Models.Database.Entities;
using BackendOcago.Services;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database
{
    public class DataContext : DbContext
    {
        private const string DATABASE_PATH = "OcaGoDB.db";

        public DbSet<User> Users { get; set; }
        public DbSet<Image> Images { get; set; }
        public DbSet<Friendship> Friendships { get; set; }
        public DbSet<Lobby> Lobbies { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<MatchRequest> MatchRequests { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            optionsBuilder
                .UseSqlite($"DataSource={baseDir}{DATABASE_PATH}")
                .EnableSensitiveDataLogging() // Ayuda a debuggear problemas de actualización
                .LogTo(Console.WriteLine); // Muestra las consultas SQL en la consola
        }

        public override int SaveChanges()
        {
            try
            {
                return base.SaveChanges();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                Console.WriteLine($"Concurrency error: {ex.Message}");
                throw;
            }
            catch (DbUpdateException ex)
            {
                Console.WriteLine($"Update error: {ex.Message}");
                throw;
            }
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                return await base.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                Console.WriteLine($"Concurrency error: {ex.Message}");
                throw;
            }
            catch (DbUpdateException ex)
            {
                Console.WriteLine($"Update error: {ex.Message}");
                throw;
            }
        }
    }
}