using System.Net.WebSockets;
using BackendOcago.WebSocketAdvanced;
using Examples.WebApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace Examples.WebApi.Controllers;

[Route("socket")]
[ApiController]
public class WebSocketController : ControllerBase
{
    private readonly WebSocketService _websocketService;
    private readonly WebSocketNetwork _websocketNetwork;

    public WebSocketController(WebSocketService websocketService, WebSocketNetwork websocketNetwork)
    {
        _websocketService = websocketService;
        _websocketNetwork = websocketNetwork;
    }

    [HttpGet]
    public async Task ConnectAsync()
    {
        // Si la petición es de tipo websocket la aceptamos
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            // Aceptamos la solicitud
            WebSocket webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

            // Manejamos la solicitud.
            await _websocketService.HandleAsync(webSocket);
        }
        // En caso contrario la rechazamos
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }

        // Cuando este método finalice, se cerrará automáticamente la conexión con el websocket
    }

    [HttpGet("advanced")]
    public async Task AdvancedConnectAsync()
    {
        // Si la petición es de tipo websocket la aceptamos
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            // Aceptamos la solicitud
            WebSocket webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

            // Manejamos la solicitud.
            await _websocketNetwork.HandleAsync(webSocket);
        }
        // En caso contrario la rechazamos
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }

        // Cuando este método finalice, se cerrará automáticamente la conexión con el websocket
    }
}
