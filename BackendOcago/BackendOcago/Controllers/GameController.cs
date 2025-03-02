﻿using BackendOcago.Models.Dtos;
using BackendOcago.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace BackendOcago.Controllers
{
    [ApiController]
    [Route("ws/game/{userId}")]
    public class GameWebSocketController : ControllerBase
    {
        private readonly GameService _gameService;
        private static readonly Dictionary<string, WebSocket> _connections = new();

        public GameWebSocketController(GameService gameService)
        {
            _gameService = gameService;
        }

        [HttpGet("connect")]
        public async Task Connect(string userId)
        {
            if (HttpContext.WebSockets.IsWebSocketRequest)
            {
                var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();

                if (_connections.ContainsKey(userId))
                {
                    Console.WriteLine($"🔄 Usuario {userId} ya estaba conectado. Cerrando conexión anterior.");
                    _connections[userId].Abort();
                }

                _connections[userId] = webSocket;
                Console.WriteLine($"✅ Usuario {userId} conectado. Total conexiones activas: {_connections.Count}");

                await HandleWebSocketConnection(userId, webSocket);
            }
            else
            {
                HttpContext.Response.StatusCode = 400;
            }
        }

        private async Task HandleWebSocketConnection(string userId, WebSocket webSocket)
        {
            var buffer = new byte[1024 * 4];
            var receiveResult = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

            while (!receiveResult.CloseStatus.HasValue)
            {
                var message = Encoding.UTF8.GetString(buffer, 0, receiveResult.Count);
                await ProcessMessage(userId, message);

                receiveResult = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
            }

            _connections.Remove(userId);
            await webSocket.CloseAsync(receiveResult.CloseStatus.Value, receiveResult.CloseStatusDescription, CancellationToken.None);
        }

        private async Task ProcessMessage(string userId, string message)
        {
            try
            {
                var jsonMessage = JsonSerializer.Deserialize<WebSocketRequest>(message);
                if (jsonMessage == null) return;

                switch (jsonMessage.Action)
                {
                    case "CreateGame":
                        var game = await _gameService.CreateGameAsync(userId);
                        await SendMessageToClient(userId, new
                        {
                            action = "gameUpdate",
                            data = game
                        });
                        break;
                    case "JoinGame":
                        var joinedGame = await _gameService.JoinGameAsync(jsonMessage.GameId, userId);
                        if (joinedGame != null)
                        {
                            await NotifyPlayers(joinedGame, "gameUpdate");
                        }
                        break;
                    case "MakeMove":
                        var move = await _gameService.MakeMoveAsync(jsonMessage.GameId, userId);
                        await NotifyPlayers(move, "moveUpdate");
                        var gameInfo2 = await _gameService.GetGameAsync(jsonMessage.GameId);
                        await SendMessageToClient(userId, new
                        {
                            action = "gameUpdate",
                            data = gameInfo2
                        });
                        break;
                    case "GetGame":
                        var gameInfo = await _gameService.GetGameAsync(jsonMessage.GameId);
                        await SendMessageToClient(userId, new
                        {
                            action = "gameUpdate",
                            data = gameInfo
                        });
                        break;
                    case "GetActiveGames":
                        var games = await _gameService.GetActiveGamesAsync();
                        await SendMessageToClient(userId, new
                        {
                            action = "activeGames",
                            data = games.Count
                        });
                        break;
                    case "Surrender":
                        var surrenderResult = await _gameService.SurrenderGameAsync(jsonMessage.GameId, userId);
                        await NotifyPlayers(surrenderResult, "gameUpdate");
                        // Enviar mensaje adicional sobre la rendición
                        await NotifyPlayers(new
                        {
                            GameId = jsonMessage.GameId,
                            PlayerId = userId,
                            Message = $"Jugador {userId} se ha rendido.",
                            GameStatus = surrenderResult.Status,
                            Winner = surrenderResult.Winner
                        }, "surrenderUpdate");
                        break;
                    case "SendChat":
                        // Procesar mensaje de chat
                        if (string.IsNullOrEmpty(jsonMessage.ChatMessage))
                        {
                            Console.WriteLine("❌ Mensaje de chat vacío, ignorando");
                            break;
                        }

                        Console.WriteLine($"💬 Mensaje de chat recibido de {userId} para partida {jsonMessage.GameId}: {jsonMessage.ChatMessage}");

                        // Obtener información del juego para verificar que el usuario está en la partida
                        var chatGameInfo = await _gameService.GetGameAsync(jsonMessage.GameId);

                        // Verificar que el usuario sea parte de la partida
                        if (chatGameInfo.Player1Id != userId && chatGameInfo.Player2Id != userId)
                        {
                            await SendMessageToClient(userId, new
                            {
                                action = "error",
                                data = new { error = "No puedes enviar mensajes a una partida en la que no participas" }
                            });
                            break;
                        }

                        // Crear objeto de mensaje de chat
                        var chatMessage = new
                        {
                            GameId = jsonMessage.GameId,
                            SenderId = userId,
                            SenderName = userId, // Podrías obtener el nombre real del usuario si lo tienes
                            Message = jsonMessage.ChatMessage,
                            Timestamp = DateTime.UtcNow
                        };

                        // Notificar a ambos jugadores
                        await NotifyChatMessage(chatGameInfo, chatMessage);
                        break;
                }
            }
            catch (Exception ex)
            {
                await SendMessageToClient(userId, new
                {
                    action = "error",
                    data = new { error = ex.Message }
                });
            }
        }

        private async Task NotifyChatMessage(GameDTO game, object chatMessage)
        {
            var messageObject = new
            {
                action = "chatMessage",
                data = chatMessage
            };

            // Enviar mensaje a ambos jugadores
            if (!string.IsNullOrEmpty(game.Player1Id))
            {
                await SendMessageToClient(game.Player1Id, messageObject);
            }

            if (!string.IsNullOrEmpty(game.Player2Id))
            {
                await SendMessageToClient(game.Player2Id, messageObject);
            }

            Console.WriteLine($"💬 Mensaje de chat enviado a jugadores de partida {game.Id}");
        }

        private async Task NotifyPlayers(object data, string action)
        {
            if (data is GameDTO game)
            {
                var messageObject = new
                {
                    action = action,
                    data = game
                };

                if (!string.IsNullOrEmpty(game.Player1Id))
                {
                    await SendMessageToClient(game.Player1Id, messageObject);
                }
                if (!string.IsNullOrEmpty(game.Player2Id))
                {
                    await SendMessageToClient(game.Player2Id, messageObject);
                }
            }
            else
            {
                // Para mensajes genéricos como la notificación de rendición
                var messageObject = new
                {
                    action = action,
                    data = data
                };

                if (data.GetType().GetProperty("GameId") != null)
                {
                    var gameId = (Guid)data.GetType().GetProperty("GameId").GetValue(data);
                    var gameInfo = await _gameService.GetGameAsync(gameId);

                    if (!string.IsNullOrEmpty(gameInfo.Player1Id))
                    {
                        await SendMessageToClient(gameInfo.Player1Id, messageObject);
                    }
                    if (!string.IsNullOrEmpty(gameInfo.Player2Id))
                    {
                        await SendMessageToClient(gameInfo.Player2Id, messageObject);
                    }
                }
            }
        }

        private async Task SendMessageToClient(string userId, object data)
        {
            if (_connections.TryGetValue(userId, out var socket) && socket.State == WebSocketState.Open)
            {
                var json = JsonSerializer.Serialize(data);
                var bytes = Encoding.UTF8.GetBytes(json);
                await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
    }

    public class WebSocketRequest
    {
        public string Action { get; set; }
        public Guid GameId { get; set; }
        public string ChatMessage { get; set; } // Nuevo campo para mensajes de chat
    }
}