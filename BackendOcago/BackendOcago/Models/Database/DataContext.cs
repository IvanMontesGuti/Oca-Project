
using BackendOcago.Models.Database.Entities;
using Microsoft.EntityFrameworkCore;

namespace BackendOcago.Models.Database
{
    public class DataContext : DbContext
    {
        private const string DATABASE_PATH = "OcaGoDB.db";

        public DbSet<User> Users { get; set; }
        public DbSet<Image> Images { get; set; }
        public DbSet<Friendship> Friendships { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory; 
            optionsBuilder.UseSqlite($"DataSource={baseDir}{DATABASE_PATH}");
        }
        /*
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            optionsBuilder.LogTo(Console.WriteLine);
            optionsBuilder.EnableSensitiveDataLogging();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");

            #if DEBUG
            optionsBuilder.UseSqlite($"DataSource={baseDir}{DATABASE_PATH}");
            #else
            optionsBuilder.UseMySql(connectionString,ServerVersion.AutoDetect(connectionString));
            #endif
        }
        */
    }
}
