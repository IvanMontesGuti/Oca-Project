using System.Net.WebSockets;
using System.Text;

namespace Examples.WebApi.Services;

public class WebSocketService
{
    public async Task HandleAsync(WebSocket webSocket)
    {
        // Mientras que el websocket del cliente esté conectado
        while (webSocket.State == WebSocketState.Open)
        {
            // Leemos el mensaje
            string message = await ReadAsync(webSocket);

            if (!string.IsNullOrWhiteSpace(message))
            {
                // Procesamos el mensaje
                string outMessage = $"[{string.Join(", ", message as IEnumerable<char>)}]";

                // Enviamos respuesta al cliente
                await SendAsync(webSocket, outMessage);
            }
        }
    }

    private async Task<string> ReadAsync(WebSocket webSocket, CancellationToken cancellation = default)
    {
        // Creo un buffer para almacenar temporalmente los bytes del contenido del mensaje
        byte[] buffer = new byte[4096];
        // Creo un StringBuilder para poder ir creando poco a poco el mensaje en formato texto
        StringBuilder stringBuilder = new StringBuilder();
        // Creo un booleano para saber cuándo termino de leer el mensaje
        bool endOfMessage = false;

        do
        {
            // Recibo el mensaje pasándole el buffer como parámetro
            WebSocketReceiveResult result = await webSocket.ReceiveAsync(buffer, cancellation);

            // Si el resultado que se ha recibido es de tipo texto lo decodifico y lo meto en el StringBuilder
            if (result.MessageType == WebSocketMessageType.Text)
            {
                // Decodifico el contenido recibido
                string message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                // Lo añado al StringBuilder
                stringBuilder.Append(message);
            }
            // Si el resultado que se ha recibido entonces cerramos la conexión
            else if (result.CloseStatus.HasValue)
            {
                // Cerramos la conexión
                await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, cancellation);
            }

            // Guardamos en nuestro booleano si hemos recibido el final del mensaje
            endOfMessage = result.EndOfMessage;
        }
        // Repetiremos iteración si el socket permanece abierto y no se ha recibido todavía el final del mensaje
        while (webSocket.State == WebSocketState.Open && !endOfMessage);

        // Finalmente devolvemos el contenido del StringBuilder
        return stringBuilder.ToString();
    }

    private Task SendAsync(WebSocket webSocket, string message, CancellationToken cancellation = default)
    {
        // Codificamos a bytes el contenido del mensaje
        byte[] bytes = Encoding.UTF8.GetBytes(message);

        // Enviamos los bytes al cliente marcando que el mensaje es un texto
        return webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, cancellation);
    }
}
