using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.Filters;
using System.Text.Json.Serialization;
using System.Text;
using BackendOcago.Models.Database;
using BackendOcago.Models.Database.Repositories;
using BackendOcago.Services;
using BackendOcago.Models.Mappers;
using Microsoft.AspNetCore.Http;

namespace BackendOcago;

public class Program
{
    public static async Task Main(string[] args)
    {
        // Especificamos el directorio de trabajo
        Directory.SetCurrentDirectory(AppContext.BaseDirectory);

        // Constructor
        var builder = WebApplication.CreateBuilder(args);

        // Añadir la configuración guardada en appsettings
        builder.Services.Configure<Settings>(builder.Configuration.GetSection(Settings.SECTION_NAME));

        // Añadir controladores con configuración para la serialización de JSON
        builder.Services.AddControllers(options =>
            options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true)
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            });

        // Añadir contexto y repositorios
        builder.Services.AddScoped<DataContext>();
        builder.Services.AddScoped<UnitOfWork>();
        builder.Services.AddScoped<UserRepository>();
        builder.Services.AddScoped<ImageRepository>();
        builder.Services.AddScoped<FriendshipRepository>();
        builder.Services.AddScoped<IGameRepository, GameRepository>();

        // Servicios
        builder.Services.AddTransient<ImageService>();
        
        builder.Services.AddScoped<IGameService, GameService>();
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<UserService>();
        builder.Services.AddScoped<FriendshipService>();
        builder.Services.AddScoped<SmartSearchService>();
        builder.Services.AddScoped<LobbyService>();

        builder.Services.AddScoped<WebSocketHandler>();


        // Mappers
        builder.Services.AddTransient<UserMapper>();
        builder.Services.AddTransient<ImageMapper>();
        builder.Services.AddScoped<FriendshipMapper>();
        

        builder.Services.AddTransient<Middleware>();


        // Swagger/OpenAPI configuración
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, new OpenApiSecurityScheme
            {
                BearerFormat = "JWT",
                Name = "Authorization",
                Description = "Hola",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.Http,
                Scheme = JwtBearerDefaults.AuthenticationScheme
            });
            options.OperationFilter<SecurityRequirementsOperationFilter>(true, JwtBearerDefaults.AuthenticationScheme);
        });

        // Configuración de autenticación con JWT
        builder.Services.AddAuthentication()
            .AddJwtBearer(options =>
            {
                var settings = builder.Configuration.GetSection(Settings.SECTION_NAME).Get<Settings>()!;
                string key = Environment.GetEnvironmentVariable("JWT_KEY") ?? throw new InvalidOperationException("JWT_KEY no está configurada.");

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
                };
            });

        // Configuración de CORS
        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        var app = builder.Build();

        // Configurar la canalización de solicitudes HTTP
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors();

        // Configuración para WebSockets
        app.UseWebSockets();
        app.UseMiddleware<Middleware>();

        app.UseHttpsRedirection();
        app.UseRouting();
        app.UseStaticFiles();

        // Habilitar autenticación y autorización
        app.UseAuthentication();
        app.UseAuthorization();

        // Configuración de archivos estáticos
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"))
        }
        );

        // Mapear controladores
        app.MapControllers();

        // Llamada al método de creación de la base de datos (seed)
        await SeedDatabase(app.Services);

        // Ejecutar la aplicación
        await app.RunAsync();

    }

    // Método para realizar la creación (seed) de la base de datos
    static async Task SeedDatabase(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<DataContext>();

        if (dbContext.Database.EnsureCreated())
        {
            var seeder = new Seeder(dbContext);
            await seeder.SeedAsync();
        }
    }
}
