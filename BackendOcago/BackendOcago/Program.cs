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

        // Habilitar logs detallados
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.AddDebug();

        

        
        



        // A�adir la configuraci�n guardada en appsettings
        builder.Services.Configure<Settings>(builder.Configuration.GetSection(Settings.SECTION_NAME));

        // A�adir controladores con configuraci�n para la serializaci�n de JSON
        builder.Services.AddControllers(options =>
            options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true)
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
            });

        // A�adir contexto y repositorios
        builder.Services.AddScoped<DataContext>();
        builder.Services.AddScoped<UnitOfWork>();
        builder.Services.AddScoped<UserRepository>();
        builder.Services.AddScoped<ImageRepository>();
        builder.Services.AddScoped<FriendshipRepository>();
        builder.Services.AddScoped<GameRepository>();

        // Servicios
        builder.Services.AddTransient<ImageService>();
        
        builder.Services.AddScoped<GameService>();
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<UserService>();
        builder.Services.AddScoped<FriendshipService>();
        builder.Services.AddScoped<SmartSearchService>();
        builder.Services.AddScoped<MatchMakingService>();

        builder.Services.AddScoped<WebSocketHandler>();


        // Mappers
        builder.Services.AddTransient<UserMapper>();
        builder.Services.AddTransient<ImageMapper>();
        builder.Services.AddScoped<FriendshipMapper>();
        

        builder.Services.AddScoped<Middleware>();


        // Swagger/OpenAPI configuraci�n
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

        // Configuraci�n de autenticaci�n con JWT
        builder.Services.AddAuthentication()
            .AddJwtBearer(options =>
            {
                var settings = builder.Configuration.GetSection(Settings.SECTION_NAME).Get<Settings>()!;
                string key = Environment.GetEnvironmentVariable("JWT_KEY") ?? throw new InvalidOperationException("JWT_KEY no est� configurada.");

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
                };
            });

        // Configuraci�n de CORS
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowVercel",
                policy =>
                {
                    policy.WithOrigins("https://oca-go-project.vercel.app/") // Reemplaza con la URL de tu frontend en Vercel
                        .AllowAnyMethod()
                        .AllowAnyHeader();
                });
        });

        


        var app = builder.Build();
        app.UseDeveloperExceptionPage();

        // Configurar la canalizaci�n de solicitudes HTTP
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseCors("AllowVercel");

        // Configuraci�n para WebSockets
        app.UseWebSockets();
        app.UseMiddleware<Middleware>();

        app.UseHttpsRedirection();
        app.UseRouting();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.UseStaticFiles();

        // Habilitar autenticaci�n y autorizaci�n


        // Configuraci�n de archivos est�ticos
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"))
        }
        );

        // Mapear controladores

        // Llamada al m�todo de creaci�n de la base de datos (seed)
        await SeedDatabase(app.Services);

        // Ejecutar la aplicaci�n
        await app.RunAsync();

    }

    // M�todo para realizar la creaci�n (seed) de la base de datos
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
