using BackendOcago.Models.Database;
using Microsoft.AspNetCore.Mvc;

[Route("socket")]
[ApiController]
public class WebSocketController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly WebSocketHandler _webSocketHandler;

    public WebSocketController(IServiceScopeFactory serviceScopeFactory, WebSocketHandler webSocketHandler)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _webSocketHandler = webSocketHandler;
    }

    [HttpGet("{userId}")]
    public async Task<IActionResult> ConnectAsync(string userId)
    {
        if (!HttpContext.WebSockets.IsWebSocketRequest)
        {
            return BadRequest("WebSocket connection expected.");
        }

        using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
        await _webSocketHandler.HandleConnection(webSocket, userId);

        return new EmptyResult();
    }
}
