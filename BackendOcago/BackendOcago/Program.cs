
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

namespace BackendOcago;

public class Program
{
    public static async Task Main(string[] args)
    {
        //Especificamos el directorio de trabajo
        Directory.SetCurrentDirectory(AppContext.BaseDirectory);

        //Constructor
        var builder = WebApplication.CreateBuilder(args);

        //Añadir la configuración guardada en appsettings
        builder.Services.Configure<Settings>(builder.Configuration.GetSection(Settings.SECTION_NAME));

        builder.Services.AddControllers(
        options => options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true);

        //Controladores
        builder.Services.AddControllers();

        builder.Services.AddControllers().AddJsonOptions(options => {
            options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        });

        //Contextos
        builder.Services.AddScoped<DataContext>();
        builder.Services.AddScoped<UnitOfWork>();
        builder.Services.AddScoped<UserRepository>();
        builder.Services.AddScoped<ImageRepository>();

        //builder.Services.AddTransient<ExampleMiddleware>();
        builder.Services.AddTransient<ImageService>();



        //Servicios
        // builder.Services.AddScoped<TextComparer>();
        builder.Services.AddScoped<AuthService>();
        builder.Services.AddScoped<UserService>();

        //Los servicios websocket son singleton siempre
        builder.Services.AddSingleton<ProcessWebSocket>();


        //Mappers
        builder.Services.AddTransient<UserMapper>();
        builder.Services.AddTransient<ImageMapper>();


        //Swagger/OpenApi
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
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

        //Configuramos program para que use el servicio de autenticacion
        builder.Services.AddAuthentication()
        .AddJwtBearer(options =>
        {
            //Accedemos a la clase settings donde esta el get de JwtKey (Donde se encuentra nuestra clave)
            Settings settings = builder.Configuration.GetSection(Settings.SECTION_NAME).Get<Settings>()!;
            //nuestra clave se guarda en la variable key
            string key = Environment.GetEnvironmentVariable("JWT_KEY");

            options.TokenValidationParameters = new TokenValidationParameters
            {
                //la unica validacion va a ser la clave
                ValidateIssuer = false,
                ValidateAudience = false,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
            };
        });

        //por defecto el navegador bloqueará las peticiones debido a la política de CORS.
        //por eso hay que habilitar Cors


        builder.Services.AddCors(options =>
        {
            options.AddDefaultPolicy(builder =>
            {
                builder.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
            });
        });


        /*if (builder.Environment.IsDevelopment())
        {
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowFrontend", policy =>
                {
                    policy.WithOrigins("https://localhost:5173").AllowAnyHeader().AllowAnyMethod();
                });
            });
        }*/
        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        //Configuración de Cors para aceptar cualquier petición
        app.UseCors();

        //app.UseMiddleware<ExampleMiddleware>();
        /*Ejemplo de middleware
        app.Use(async (context, next) =>
        {
            string method = context.Request.Method;

            if (method == "POST"){
                // Devuelvo error HTTP 418: I'm a teapot
                context.Response.StatusCode = 418;
            }
            else
            {
                //voy al siguiente middleware
                await next();
            }
        });
        */

        //Indicamos que queremos usar webSockets
        app.UseWebSockets();

        app.UseHttpsRedirection();
        app.UseStaticFiles();

        //Habilita la autenticación
        app.UseAuthentication();
        //Habilita la autorización
        app.UseAuthorization();

        //Permite transmitir archivos estáticos
       
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"))
        });
        
        app.MapControllers();

        //Llamamos al método de creación de base de datos de respaldo (seed)
        await SeedDatabase(app.Services);

        await app.RunAsync();
    }

    static async Task SeedDatabase(IServiceProvider serviceProvider)
    {
        using IServiceScope scope = serviceProvider.CreateScope();
        using DataContext dbContext = scope.ServiceProvider.GetService<DataContext>()!;

        if (dbContext.Database.EnsureCreated())
        {
            Seeder seeder = new Seeder(dbContext);
            await seeder.SeedAsync();
        }

    }

}
