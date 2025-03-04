"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Dice5, Trophy, Clock } from "lucide-react"
import { useAuth } from "@/context/AuthContext";

// Define types for our WebSocket messages
type WebSocketMessage = {
  Action: "CreateGame" | "JoinGame" | "Surrender" | "MakeMove" | "GetGame" | "GetActiveGames" | "SendChat"
  GameId?: string
  ChatMessage?: string
}

// Define a type for the chat message data
type ChatMessageData = {
  GameId: string
  Message: string
  SenderId: string
  SenderName: string
  Timestamp: string
}

// Game state interface based on the actual response structure
interface GameData {
  Id: string
  IsPlayer1Turn: boolean
  Player1Id: string
  Player1Position: number
  Player1RemainingTurns: number
  Player2Id: string | null
  Player2Position: number
  Player2RemainingTurns: number
  Status: 0 | 1 | 2 // 0 = not started, 1 = in progress, 2 = finished
  Winner: string | null
}

interface GameState {
  gameData: GameData | null
  isConnected: boolean
  messages: { sender: string; text: string }[]
  activeGames?: string[]
}

// Modificar la constante de dimensiones del tablero
// Reemplazar cualquier referencia a dimensiones del tablero con estas constantes
const BOARD_WIDTH = 12
const BOARD_HEIGHT = 8
const CELL_WIDTH = 99
const CELL_HEIGHT = 113

// Mapeo de posiciones a coordenadas x,y en la cuadrícula de 12x9
const POSITION_COORDINATES = {
  0: { x: 2, y: 7 },
  1: { x: 3, y: 7 },
  2: { x: 4, y: 7 },
  3: { x: 5, y: 7 },
  4: { x: 6, y: 7 },
  5: { x: 7, y: 7 },
  6: { x: 8, y: 7 },
  7: { x: 9, y: 7 },
  8: { x: 10, y: 7 },
  9: { x: 11, y: 7 },
  10: { x: 11, y: 6 },
  11: { x: 11, y: 5 },
  12: { x: 11, y: 4 },
  13: { x: 11, y: 3 },
  14: { x: 11, y: 2 },
  15: { x: 11, y: 1 },
  16: { x: 11, y: 0 },
  17: { x: 10, y: 0 },
  18: { x: 9, y: 0 },
  19: { x: 8, y: 0 },
  20: { x: 7, y: 0 },
  21: { x: 6, y: 0 },
  22: { x: 5, y: 0 },
  23: { x: 4, y: 0 },
  24: { x: 3, y: 0 },
  25: { x: 2, y: 0 },
  26: { x: 1, y: 0 },
  27: { x: 0, y: 0 },
  28: { x: 0, y: 1 },
  29: { x: 0, y: 2 },
  30: { x: 0, y: 3 },
  31: { x: 0, y: 4 },
  32: { x: 0, y: 5 },
  33: { x: 0, y: 6 },
  34: { x: 1, y: 6 },
  35: { x: 2, y: 6 },
  36: { x: 3, y: 6 },
  37: { x: 4, y: 6 },
  38: { x: 5, y: 6 },
  39: { x: 6, y: 6 },
  40: { x: 7, y: 6 },
  41: { x: 8, y: 6 },
  42: { x: 9, y: 6 },
  43: { x: 10, y: 6 },
  44: { x: 10, y: 5 },
  45: { x: 10, y: 4 },
  46: { x: 10, y: 3 },
  47: { x: 10, y: 2 },
  48: { x: 10, y: 1 },
  49: { x: 9, y: 1 },
  50: { x: 8, y: 1 },
  51: { x: 7, y: 1 },
  52: { x: 6, y: 1 },
  53: { x: 5, y: 1 },
  54: { x: 4, y: 1 },
  55: { x: 3, y: 1 },
  56: { x: 2, y: 1 },
  57: { x: 1, y: 1 },
  58: { x: 1, y: 2 },
  59: { x: 1, y: 3 },
  60: { x: 1, y: 4 },
  61: { x: 1, y: 5 },
  62: { x: 2, y: 5 },
  63: { x: 4, y: 5 },
}

// Reemplazar la función debugPosition con esta versión mejorada
const getTokenPosition = (position: number) => {
  const coords = POSITION_COORDINATES[position]
  if (!coords) {
    console.error(`No coordinates found for position ${position}`)
    return { x: 0, y: 0 }
  }

  // Calcular la posición exacta en píxeles
  const pixelX = coords.x * CELL_WIDTH + CELL_WIDTH / 2
  const pixelY = coords.y * CELL_HEIGHT + CELL_HEIGHT / 2

  // Convertir a porcentaje para el posicionamiento relativo
  const percentX = (pixelX / (BOARD_WIDTH * CELL_WIDTH)) * 100
  const percentY = (pixelY / (BOARD_HEIGHT * CELL_HEIGHT)) * 100

  return { x: percentX, y: percentY }
}

export default function WebSocketGame() {
  const { userInfo } = useAuth();
  const router = useRouter()
  const [username, setUsername] = useState<string>("")
  const [gameIdInput, setGameIdInput] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false)
  const [inactivityTimer, setInactivityTimer] = useState<number>(30)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)
  const [isRollingDice, setIsRollingDice] = useState<boolean>(false)

  const [gameState, setGameState] = useState<GameState>({
    gameData: null,
    isConnected: false,
    messages: [],
  })

  const webSocketRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to WebSocket
  const connectWebSocket = () => {
    if (!username) return;
  
    const ws = new WebSocket(`wss://localhost:7107/ws/game/${userInfo?.id}/connect`);
  
    ws.onopen = () => {
      console.log("WebSocket connected");
      setGameState((prev) => ({ ...prev, isConnected: true }));
      
      // Cuando se reconecta, solicita el estado actual del juego si ya había uno
      if (prev.gameData?.Id) {
        console.log("Reconnected - requesting game state for:", prev.gameData.Id);
        setTimeout(() => {
          ws.send(JSON.stringify({ Action: "GetGame", GameId: prev.gameData.Id }));
        }, 500);
      }
    };
  
    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log("Received data:", response);
    
      if (response.action === "gameUpdate" && response.data) {
        // Manejo existente para actualizaciones completas del juego
        resetInactivityTimer();
    
        if (response.data.Id) {
          localStorage.setItem('currentGameId', response.data.Id);
        }
    
        console.log(
          "Player 1 position:",
          response.data.Player1Position,
          "Coordinates:",
          POSITION_COORDINATES[response.data.Player1Position],
        );
        if (response.data.Player2Id) {
          console.log(
            "Player 2 position:",
            response.data.Player2Position,
            "Coordinates:",
            POSITION_COORDINATES[response.data.Player2Position],
          );
        }
    
        setGameState((prev) => ({
          ...prev,
          gameData: response.data,
        }));
    
        if (response.data.Status === 2 && response.data.Winner) {
          setShowWinnerModal(true);
          stopInactivityTimer();
        }
    
        if (response.data.Status === 1 && !isTimerRunning) {
          startInactivityTimer();
        }
      } else if (response.action === "moveUpdate" && response.data) {
        // Nuevo manejo para actualizaciones parciales después de un movimiento
        resetInactivityTimer();
    
        setGameState((prev) => {
          if (!prev.gameData) return prev; // Si no hay gameData previo, no hacemos nada
    
          const updatedGameData = {
            ...prev.gameData,
            // Actualizar campos específicos del mensaje moveUpdate
            Player1Position: prev.gameData.Player1Id === response.data.PlayerId ? response.data.NewPosition : prev.gameData.Player1Position,
            Player2Position: prev.gameData.Player2Id === response.data.PlayerId ? response.data.NewPosition : prev.gameData.Player2Position,
            Player1RemainingTurns: response.data.Player1RemainingTurns,
            Player2RemainingTurns: response.data.Player2RemainingTurns,
            Status: response.data.GameStatus,
            // Determinar de quién es el turno basándonos en NextTurnPlayerId
            IsPlayer1Turn: response.data.NextTurnPlayerId === prev.gameData.Player1Id,
          };
    
          console.log("Updated game state after moveUpdate:", updatedGameData);
    
          return {
            ...prev,
            gameData: updatedGameData,
          };
        });
    
        // Mostrar mensaje del movimiento en el chat (opcional)
        if (response.data.Message) {
          setGameState((prev) => ({
            ...prev,
            messages: [...prev.messages, { sender: "Sistema", text: response.data.Message }],
          }));
        }
    
        // Iniciar el temporizador si el juego está en progreso y no está corriendo
        if (response.data.GameStatus === 1 && !isTimerRunning) {
          startInactivityTimer();
        }
      } else if (response.action === "activeGames" && response.data) {
        setGameState((prev) => ({ ...prev, activeGames: response.data }));
      } else if (response.action === "chatMessage" && response.data) {
        const chatData = response.data;
        setGameState((prev) => ({
          ...prev,
          messages: [...prev.messages, { sender: chatData.SenderName, text: chatData.Message }],
        }));
      }
    };
  
    ws.onclose = () => {
      console.log("WebSocket disconnected - attempting to reconnect in 3 seconds");
      setGameState((prev) => ({ ...prev, isConnected: false }));
      stopInactivityTimer();
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          console.log("Attempting to reconnect WebSocket...");
          connectWebSocket();
        }
      }, 3000);
    };
  
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  
    webSocketRef.current = ws;
    setIsLoggedIn(true);
  };

  // Inactivity timer functions
  const startInactivityTimer = () => {
    setIsTimerRunning(true);
    setInactivityTimer(30); // Reset to 30 seconds
  
    timerRef.current = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          console.log("Timer reached zero, preparing to surrender due to inactivity...");
          
          // Get the game ID from state or localStorage backup
          const gameId = gameState.gameData?.Id || localStorage.getItem('currentGameId');
          
          // Debug the current state
          console.log("Current game state:", JSON.stringify({
            gameId: gameId,
            stateGameId: gameState.gameData?.Id,
            status: gameState.gameData?.Status,
            wsState: webSocketRef.current ? webSocketRef.current.readyState : 'null'
          }));
          
          if (!gameId) {
            console.error("Cannot surrender: No game ID available in state or backup");
            stopInactivityTimer();
            return 0;
          }
          
          if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
            console.error("Cannot surrender: WebSocket not connected (state:", 
              webSocketRef.current ? webSocketRef.current.readyState : "null)");
            
            // Try to reconnect
            if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.CONNECTING) {
              console.log("Attempting to reconnect before surrendering...");
              connectWebSocket();
              
              // Set a one-time timer to try surrender after reconnection
              setTimeout(() => {
                if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                  console.log("Reconnected - now attempting delayed surrender");
                  webSocketRef.current.send(JSON.stringify({ Action: "Surrender", GameId: gameId }));
                }
              }, 2000);
            }
            
            stopInactivityTimer();
            return 0;
          }
          
          // We have both game ID and active websocket - now surrender
          console.log("Executing surrender for game:", gameId);
          
          try {
            // Send surrender message immediately
            const surrenderMsg = JSON.stringify({ Action: "Surrender", GameId: gameId });
            console.log("Sending message:", surrenderMsg);
            webSocketRef.current.send(surrenderMsg);
            console.log("Surrender message sent successfully");
          } catch (error) {
            console.error("Error sending surrender message:", error);
          }
          
          stopInactivityTimer();
          return 0;
        }        
        return prev - 1;
      });
    }, 1000);
  };

  const stopInactivityTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsTimerRunning(false)
  }, [])

  const resetInactivityTimer = () => {
    stopInactivityTimer()
    if (gameState.gameData?.Status === 1) {
      startInactivityTimer()
    }
  }

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Send WebSocket message
  const sendMessage = (message: WebSocketMessage) => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message))
    } else {
      console.error("WebSocket is not connected")
    }
  }

  // Game actions
  const createGame = () => {
    sendMessage({ Action: "CreateGame" })
  }

  const joinGame = () => {
    if (gameIdInput) {
      sendMessage({ Action: "JoinGame", GameId: gameIdInput })
    }
  }

  const surrender = () => {
    console.log("Manually initiating surrender...");
    
    // Try to get game ID from state or backup
    const gameId = gameState.gameData?.Id || localStorage.getItem('currentGameId');
    
    // Add debugging info
    console.log("Current game state:", JSON.stringify({
      gameId: gameId,
      stateGameId: gameState.gameData?.Id,
      status: gameState.gameData?.Status,
      wsState: webSocketRef.current ? webSocketRef.current.readyState : 'null'
    }));
    
    if (!gameId) {
      console.error("Cannot surrender: No game ID available in state or backup");
      return;
    }
  
    if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
      console.error("Cannot surrender: WebSocket not connected");
      return;
    }
  
    try {
      console.log("Executing surrender for game:", gameId);
      const surrenderMsg = JSON.stringify({ Action: "Surrender", GameId: gameId });
      console.log("Sending message:", surrenderMsg);
      webSocketRef.current.send(surrenderMsg);
      console.log("Surrender message sent successfully");
    } catch (error) {
      console.error("Error sending surrender message:", error);
    }
  };
  
  // 4. Load any saved game ID on component mount
  useEffect(() => {
    const savedGameId = localStorage.getItem('currentGameId');
    if (savedGameId && webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      console.log("Found saved game ID on mount:", savedGameId);
      // Request game info for the saved ID
      webSocketRef.current.send(JSON.stringify({ Action: "GetGame", GameId: savedGameId }));
    }
    
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
      stopInactivityTimer();
    };
  }, [stopInactivityTimer]);
  

  const makeMove = () => {
    if (gameState.gameData?.Id) {
      sendMessage({ Action: "MakeMove", GameId: gameState.gameData.Id })
      resetInactivityTimer()
    }
  }

  

  const getActiveGames = () => {
    sendMessage({ Action: "GetActiveGames" })
  }

  const sendChatMessage = () => {
    if (message.trim() && gameState.gameData?.Id) {
      sendMessage({
        Action: "SendChat",
        GameId: gameState.gameData.Id,
        ChatMessage: message,
      })
      setMessage("")
    }
  }

  // Clean up WebSocket and timer on component unmount
  useEffect(() => {
    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close()
      }
      stopInactivityTimer()
    }
  }, [stopInactivityTimer])

  // Función modificada para cerrar el modal y redirigir
  const closeWinnerModalAndRedirect = () => {
    setShowWinnerModal(false)
    router.push("/menu")
  }

  // Winner modal actualizado
  const WinnerModal = () => {
    if (!showWinnerModal || !gameState.gameData?.Winner) return null

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-purple-900 p-8 rounded-lg max-w-md w-full text-center animate-bounce">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-3xl font-bold mb-4">¡Ganador!</h2>
          <p className="text-2xl mb-6">{gameState.gameData.Winner}</p>
          <Button onClick={closeWinnerModalAndRedirect} className="bg-yellow-400 text-black hover:bg-yellow-500">
            Cerrar
          </Button>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-purple-800 text-white">
        <h1 className="text-3xl font-bold mb-6">OcaGo! Game</h1>
        <div className="w-full max-w-md space-y-4">
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white text-black"
          />
          <Button onClick={connectWebSocket} className="w-full bg-yellow-400 text-black hover:bg-yellow-500">
            Connect
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-purple-800 text-white p-4">
      <header className="bg-purple-900 p-4 rounded-lg mb-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dice5 className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-bold text-yellow-400">OcaGo! - El juego de la oca</h1>
          </div>
          {username && (
            <div className="bg-purple-700 px-3 py-1 rounded-full">
              <span className="text-sm font-medium">Jugador: </span>
              <span className="text-yellow-400 font-bold">{username}</span>
            </div>
          )}
        </div>
      </header>
      
      {/* Game ID display */}
      {gameState.gameData?.Id && (
        <div className="text-center mb-2 text-yellow-400 font-mono">ID: {gameState.gameData.Id}</div>
      )}

      {/* Players names display */}
      {gameState.gameData && (
        <div className="flex justify-center gap-8 mb-4">
          <div className="bg-red-600 px-4 py-2 rounded-lg shadow-lg">
            <span className="font-bold">Jugador 1: </span>
            <span>{gameState.gameData.Player1Id}</span>
          </div>
          {gameState.gameData.Player2Id && (
            <div className="bg-blue-600 px-4 py-2 rounded-lg shadow-lg">
              <span className="font-bold">Jugador 2: </span>
              <span>{gameState.gameData.Player2Id}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          TURNO:{" "}
          <span className="text-yellow-400">
            {gameState.gameData?.IsPlayer1Turn
              ? gameState.gameData.Player1Id
              : gameState.gameData?.Player2Id || "Esperando oponente"}
          </span>
        </h1>
        <div className="flex space-x-4 items-center">
          <div className={`flex items-center ${inactivityTimer <= 10 ? "text-red-500 font-bold animate-pulse" : ""}`}>
            <Clock className="mr-1" size={16} />
            Tiempo restante: {formatTime(inactivityTimer)}
          </div>
          <div>Turnos penalizados 1: {gameState.gameData?.Player1RemainingTurns || 0}</div>
          <div>Turnos penalizados 2: {gameState.gameData?.Player2RemainingTurns || 0}</div>
          <Button onClick={surrender} className="bg-red-800 hover:bg-red-900">
            Rendirse
          </Button>
        </div>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Left sidebar */}
        <div className="w-1/4 flex flex-col gap-4">
          <div className="bg-gray-900 rounded-lg p-4 flex-1">
            <h2 className="text-2xl font-bold mb-2">Chat</h2>
            <div className="bg-gray-700 rounded-lg p-2 max-h-80 overflow-y-auto mb-2">
              {gameState.messages.map((msg, index) => (
                <div key={index} className="mb-2">
                  <span className="font-bold">{msg.sender}: </span>
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            <div className="flex">
              <Input
                type="text"
                placeholder="Escribe algo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 bg-gray-800"
              />
              <Button onClick={sendChatMessage} className="ml-2 bg-blue-600 hover:bg-blue-700" size="icon">
                <Send size={16} />
              </Button>
            </div>
          </div>

          <div className="bg-blue-900 rounded-lg p-4 flex flex-col items-center">
            <div
              className={`w-24 h-24 bg-yellow-400 rounded-lg mb-4 flex items-center justify-center ${
                isRollingDice ? "animate-spin-slow" : ""
              }`}
            >
              <Dice5 size={64} className="text-white" />
            </div>
            <Button
              onClick={() => {
                setIsRollingDice(true)
                setTimeout(() => {
                  makeMove()
                  setIsRollingDice(false)
                }, 1000)
              }}
              className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-xl"
              disabled={
                (gameState.gameData?.IsPlayer1Turn && username !== gameState.gameData?.Player1Id) ||
                (!gameState.gameData?.IsPlayer1Turn && username !== gameState.gameData?.Player2Id) ||
                gameState.gameData?.Status !== 1 ||
                isRollingDice
              }
            >
              TIRAR
            </Button>
          </div>

          <div className="space-y-2">
  {!gameState.gameData?.Id ? (
    <>
      <Button onClick={createGame} className="w-full bg-green-600 hover:bg-green-700">
        Create New Game
      </Button>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Game ID"
          value={gameIdInput}
          onChange={(e) => setGameIdInput(e.target.value)}
          className="flex-1 bg-gray-800"
        />
        <Button onClick={joinGame} className="bg-blue-600 hover:bg-blue-700">
          Join
        </Button>
      </div>
    </>
  ) : (
    <div className="bg-gray-800 p-2 rounded">
      Game Status:{" "}
      {gameState.gameData.Status === 0
        ? "Waiting for players"
        : gameState.gameData.Status === 1
          ? "In progress"
          : "Finished"}
    </div>
  )}
  <Button onClick={getActiveGames} className="w-full bg-purple-600 hover:bg-purple-700">
    Get Active Games
  </Button>
</div>
</div>
        {/* Game board */}
        <div className="w-3/4 bg-gray-900 rounded-lg p-4">
          <div
            className="relative w-full h-full"
            style={{ aspectRatio: `${BOARD_WIDTH * CELL_WIDTH}/${BOARD_HEIGHT * CELL_HEIGHT}` }}
          >
            <Image src="/images/tablero.svg" alt="Tablero de OcaGo" layout="fill" objectFit="contain" />

            {/* Grid de referencia (solo para depuración, puedes comentarlo en producción) */}
            <div
              className="absolute inset-0 grid"
              style={{
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${CELL_WIDTH}px)`,
                gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${CELL_HEIGHT}px)`,
                opacity: 0,
                pointerEvents: "none",
              }}
            >
              {Array.from({ length: BOARD_WIDTH * BOARD_HEIGHT }).map((_, index) => {
                const x = index % BOARD_WIDTH
                const y = Math.floor(index / BOARD_WIDTH)
                return <div key={index} className="border border-red-500" />
              })}
            </div>

            {gameState.gameData && (
              <>
                {/* Player 1 token */}
                <div
                  className="absolute w-8 h-8 bg-red-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                  style={{
                    left: `${getTokenPosition(gameState.gameData.Player1Position).x}%`,
                    top: `${getTokenPosition(gameState.gameData.Player1Position).y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                    transition: "left 1.5s ease-in-out, top 1.5s ease-in-out",
                  }}
                >
                  <span className="text-white font-bold text-xs">P1</span>
                </div>

                {/* Player 2 token */}
                {gameState.gameData.Player2Id && (
                  <div
                    className="absolute w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                    style={{
                      left: `${getTokenPosition(gameState.gameData.Player2Position).x}%`,
                      top: `${getTokenPosition(gameState.gameData.Player2Position).y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
                      transition: "left 1.5s ease-in-out, top 1.5s ease-in-out",
                    }}
                  >
                    <span className="text-white font-bold text-xs">P2</span>
                  </div>
                )}

                {/* Indicador de turno */}
                {gameState.gameData.Status === 1 && (
                  <div
                    className="absolute w-12 h-12 rounded-full border-4 border-yellow-400 animate-pulse"
                    style={{
                      left: `${getTokenPosition(gameState.gameData.IsPlayer1Turn ? gameState.gameData.Player1Position : gameState.gameData.Player2Position).x}%`,
                      top: `${getTokenPosition(gameState.gameData.IsPlayer1Turn ? gameState.gameData.Player1Position : gameState.gameData.Player2Position).y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 5,
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active games list */}
      {gameState.activeGames && gameState.activeGames.length > 0 && (
        <div className="mt-4 bg-gray-900 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Active Games</h2>
          <div className="grid grid-cols-4 gap-2">
            {gameState.activeGames.map((game, index) => (
              <Button
                key={index}
                onClick={() => {
                  setGameIdInput(game)
                  joinGame()
                }}
                className="bg-blue-600 hover:bg-blue-700 truncate"
              >
                {game}
              </Button>
            ))}
          </div>
        </div>
        
      )}

      {/* Winner modal */}
      <WinnerModal />
    </div>
    
  )
}

