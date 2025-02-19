using System.Collections.Concurrent;
using System.Net.WebSockets;

namespace BackendOcago.Services
{
    public static class WebSocketConnectionManager
    {
        // Diccionario estático para almacenar las conexiones activas
        private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();

        public static void AddConnection(string userId, WebSocket webSocket)
        {
            if (_connections.ContainsKey(userId))
            {
                _connections[userId].Abort();
            }

            _connections[userId] = webSocket;
        }

        public static WebSocket GetConnection(string userId)
        {
            _connections.TryGetValue(userId, out var socket);
            return socket;
        }

        public static void RemoveConnection(string userId)
        {
            _connections.TryRemove(userId, out _);
        }

        public static int ActiveConnectionsCount => _connections.Count;
    }
}
