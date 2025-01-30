using BackendOcago.Models.Database;
using BackendOcago.WebSocketAdvanced;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using System.Net.WebSockets;

[Route("socket")]
[ApiController]
public class WebSocketController : ControllerBase
{
    private readonly IServiceProvider _serviceProvider;

    public WebSocketController(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    [HttpGet("{userId}")]
    public async Task ConnectAsync(long userId)
    {
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<DataContext>();

            var handler = new WebSocketHandler(userId, webSocket, dbContext);
            await handler.HandleAsync();
        }
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }
}
