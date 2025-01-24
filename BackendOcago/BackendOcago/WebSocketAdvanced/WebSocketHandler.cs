using BackendOcago.Models.Database.Entities;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace BackendOcago.WebSocketAdvanced;

public class WebSocketHandler : IDisposable
{
    private const int BUFFER_SIZE = 4096;

    private readonly WebSocket _webSocket;
    private readonly byte[] _buffer;

    public int Id { get; init; }
    public bool IsOpen => _webSocket.State == WebSocketState.Open;

    // Eventos para notificar cuando se recibe un mensaje o se desconecta un usuario
    public event Func<WebSocketHandler, string, Task> MessageReceived;
    public event Func<WebSocketHandler, Task> Disconnected;

    public WebSocketHandler(int id, WebSocket webSocket)
    {
        Id = id;
        _webSocket = webSocket;
        _buffer = new byte[BUFFER_SIZE];
    }
    public event Func<WebSocketHandler, Friendship, Task> FriendshipRequestReceived;
    public async Task SendFriendshipRequestAsync(Friendship invitation)
    {
        if (IsOpen)
        {
            string message = $"Solicitud de amistad: {{\"SenderId\": {invitation.SenderId}, \"ReceiverId\": {invitation.ReceiverId}, \"Status\": \"{invitation.Status}\"}}";
            await SendAsync(message);
        }
    }

    public async Task HandleAsync()
    {
        // Mientras que el websocket esté conectado
        while (IsOpen)
        {
            // Leemos el mensaje
            string message = await ReadAsync();

            // Si hay mensaje y hay suscriptores al evento MessageReceived, gestionamos el evento
            if (!string.IsNullOrWhiteSpace(message) && MessageReceived != null)
            {
                await MessageReceived.Invoke(this, message);
            }
        }

        // Si hay suscriptores al evento Disconnected, gestionamos el evento
        if (Disconnected != null)
        {
            await Disconnected.Invoke(this);
        }
    }

    private async Task<string> ReadAsync()
    {
        // Creamos un MemoryStream para almacenar el contenido del mensaje
        using MemoryStream textStream = new MemoryStream();
        WebSocketReceiveResult receiveResult;

        do
        {
            // Recibimos el mensaje
            receiveResult = await _webSocket.ReceiveAsync(_buffer, CancellationToken.None);

            // Si el mensaje es de tipo texto, lo escribimos en el MemoryStream
            if (receiveResult.MessageType == WebSocketMessageType.Text)
            {
                textStream.Write(_buffer, 0, receiveResult.Count);
            }
            // Si el mensaje es de tipo Close, cerramos la conexión
            else if (receiveResult.CloseStatus.HasValue)
            {
                await _webSocket.CloseAsync(receiveResult.CloseStatus.Value, receiveResult.CloseStatusDescription, CancellationToken.None);
            }
        }
        while (!receiveResult.EndOfMessage);

        // Decodificamos el mensaje
        string message = Encoding.UTF8.GetString(textStream.ToArray());

        return message;
    }

    public async Task SendAsync(string message)
    {
        // Si el websocket está abierto, enviamos el mensaje
        if (IsOpen)
        {
            // Convertimos el mensaje a bytes y lo enviamos
            byte[] bytes = Encoding.UTF8.GetBytes(message);
            await _webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);
        }
    }

    public void Dispose()
    {
        // Cerramos el websocket
        _webSocket.Dispose();
    }
}
