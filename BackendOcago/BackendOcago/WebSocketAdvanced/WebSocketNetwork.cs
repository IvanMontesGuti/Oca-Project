using BackendOcago.Models.Database.Entities;
using BackendOcago.Models.Database.Enum;
using System.Net.WebSockets;

namespace BackendOcago.WebSocketAdvanced;

public class WebSocketNetwork
{
    // Contador para asignar un id a cada WebSocketHandler
    private static int _idCounter = 0;

    // Lista de WebSocketHandler (clase que gestiona cada WebSocket)
    private readonly List<WebSocketHandler> _handlers = new List<WebSocketHandler>();
    // Semáforo para controlar el acceso a la lista de WebSocketHandler
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

    public async Task HandleAsync(WebSocket webSocket)
    {
        // Creamos un nuevo WebSocketHandler a partir del WebSocket recibido y lo añadimos a la lista
        WebSocketHandler handler = await AddWebsocketAsync(webSocket);

        // Notificamos a los usuarios que un nuevo usuario se ha conectado
        await NotifyUserConnectedAsync(handler);
        // Esperamos a que el WebSocketHandler termine de manejar la conexión
        await handler.HandleAsync();
    }

    private async Task<WebSocketHandler> AddWebsocketAsync(WebSocket webSocket)
    {
        // Esperamos a que haya un hueco disponible
        await _semaphore.WaitAsync();

        // Sección crítica
        // Creamos un nuevo WebSocketHandler, nos suscribimos a sus eventos y lo añadimos a la lista
        WebSocketHandler handler = new WebSocketHandler(_idCounter, webSocket);
        handler.Disconnected += OnDisconnectedAsync;
        handler.MessageReceived += OnMessageReceivedAsync;
        _handlers.Add(handler);

        // Incrementamos el contador para el siguiente
        _idCounter++;

        // Liberamos el semáforo
        _semaphore.Release();

        return handler;
    }

    private Task NotifyUserConnectedAsync(WebSocketHandler newHandler)
    {
        // Lista donde guardar las tareas de envío de mensajes
        List<Task> tasks = new List<Task>();
        // Guardamos una copia de los WebSocketHandler para evitar problemas de concurrencia
        WebSocketHandler[] handlers = _handlers.ToArray();
        int totalHandlers = handlers.Length;

        string messageToNew = $"Hay {totalHandlers} usuarios conectados, tu id es {newHandler.Id}";
        string messageToOthers = $"Se ha conectado usuario con id {newHandler.Id}. En total hay {totalHandlers} usuarios conectados";

        // Enviamos un mensaje personalizado al nuevo usuario y otro al resto
        foreach (WebSocketHandler handler in handlers)
        {
            string message = handler.Id == newHandler.Id ? messageToNew : messageToOthers;

            tasks.Add(handler.SendAsync(message));
        }

        // Devolvemos una tarea que se completará cuando todas las tareas de envío de mensajes se completen
        return Task.WhenAll(tasks);
    }

    private async Task OnDisconnectedAsync(WebSocketHandler disconnectedHandler)
    {
        // Esperamos a que haya un hueco disponible
        await _semaphore.WaitAsync();

        // Sección crítica
        // Nos desuscribimos de los eventos y eliminamos el WebSocketHandler de la lista
        disconnectedHandler.Disconnected -= OnDisconnectedAsync;
        disconnectedHandler.MessageReceived -= OnMessageReceivedAsync;
        _handlers.Remove(disconnectedHandler);

        // Liberamos el semáforo
        _semaphore.Release();

        // Lista donde guardar las tareas de envío de mensajes
        List<Task> tasks = new List<Task>();
        // Guardamos una copia de los WebSocketHandler para evitar problemas de concurrencia
        WebSocketHandler[] handlers = _handlers.ToArray();

        string message = $"Se ha desconectado el usuario con id {disconnectedHandler.Id}. Ahora hay {handlers.Length} usuarios conectados";

        // Enviamos el mensaje al resto de usuarios
        foreach (WebSocketHandler handler in handlers)
        {
            tasks.Add(handler.SendAsync(message));
        }

        // Esperamos a que todas las tareas de envío de mensajes se completen
        await Task.WhenAll(tasks);
    }

    private Task OnMessageReceivedAsync(WebSocketHandler userHandler, string message)
    {

        // Lista donde guardar las tareas de envío de mensajes
        List<Task> tasks = new List<Task>();
        // Guardamos una copia de los WebSocketHandler para evitar problemas de concurrencia
        WebSocketHandler[] handlers = _handlers.ToArray();

        string messageToMe = $"Tú: {message}";
        string messageToOthers = $"Usuario {userHandler.Id}: {message}";

        // Enviamos un mensaje personalizado al nuevo usuario y otro al resto
        foreach (WebSocketHandler handler in handlers)
        {
            string messageToSend = handler.Id == userHandler.Id ? messageToMe : messageToOthers;
            tasks.Add(handler.SendAsync(messageToSend));
        }

        // Devolvemos una tarea que se completará cuando todas las tareas de envío de mensajes se completen
        return Task.WhenAll(tasks);
    }
}
