"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Dice5, Trophy, Clock } from "lucide-react"

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

// Mapeo de posiciones a coordenadas x,y en la cuadrícula de 12x9
const POSITION_COORDINATES = {
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

export default function WebSocketGame() {
  const router = useRouter()
  const [username, setUsername] = useState<string>("")
  const [gameIdInput, setGameIdInput] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false)
  const [inactivityTimer, setInactivityTimer] = useState<number>(120)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false)

  const [gameState, setGameState] = useState<GameState>({
    gameData: null,
    isConnected: false,
    messages: [],
  })

  const webSocketRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Connect to WebSocket
  const connectWebSocket = () => {
    if (!username) return

    const ws = new WebSocket(`wss://localhost:7107/ws/game/${username}/connect`)

    ws.onopen = () => {
      console.log("WebSocket connected")
      setGameState((prev) => ({ ...prev, isConnected: true }))
    }

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data)
      console.log("Received data:", response)

      if (response.action === "gameUpdate" && response.data) {
        // Reset inactivity timer when game updates
        resetInactivityTimer()

        setGameState((prev) => ({
          ...prev,
          gameData: response.data,
        }))

        // Check if game is finished and show winner modal
        if (response.data.Status === 2 && response.data.Winner) {
          setShowWinnerModal(true)
          stopInactivityTimer()
        }

        // Start timer if game is in progress
        if (response.data.Status === 1 && !isTimerRunning) {
          startInactivityTimer()
        }
      } else if (response.action === "activeGames" && response.data) {
        setGameState((prev) => ({ ...prev, activeGames: response.data }))
      } else if (response.action === "chatMessage" && response.data) {
        const chatData = response.data as ChatMessageData
        setGameState((prev) => ({
          ...prev,
          messages: [...prev.messages, { sender: chatData.SenderName, text: chatData.Message }],
        }))
      }
    }

    ws.onclose = () => {
      console.log("WebSocket disconnected")
      setGameState((prev) => ({ ...prev, isConnected: false }))
      stopInactivityTimer()
    }

    ws.onerror = (error) => {
      console.error("WebSocket error:", error)
    }

    webSocketRef.current = ws
    setIsLoggedIn(true)
  }

  // Inactivity timer functions
  const startInactivityTimer = () => {
    setIsTimerRunning(true)
    setInactivityTimer(120) // Reset to 2 minutes

    timerRef.current = setInterval(() => {
      setInactivityTimer((prev) => {
        if (prev <= 1) {
          // Time's up, call surrender
          surrender()
          stopInactivityTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

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
    if (gameState.gameData?.Id) {
      sendMessage({ Action: "Surrender", GameId: gameState.gameData.Id })
    }
  }

  const makeMove = () => {
    if (gameState.gameData?.Id) {
      sendMessage({ Action: "MakeMove", GameId: gameState.gameData.Id })
      resetInactivityTimer()
    }
  }

  const getGameInfo = () => {
    if (gameState.gameData?.Id) {
      sendMessage({ Action: "GetGame", GameId: gameState.gameData.Id })
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
          <div className="flex items-center">
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
            <div className="bg-gray-700 rounded-lg p-2 h-[calc(100%-80px)] overflow-y-auto mb-2">
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
            <div className="w-24 h-24 bg-yellow-400 rounded-lg mb-4 flex items-center justify-center">
              <Dice5 size={64} className="text-white" />
            </div>
            <Button
              onClick={makeMove}
              className="w-full bg-yellow-400 text-black hover:bg-yellow-500 font-bold text-xl"
              disabled={
                (gameState.gameData?.IsPlayer1Turn && username !== gameState.gameData?.Player1Id) ||
                (!gameState.gameData?.IsPlayer1Turn && username !== gameState.gameData?.Player2Id) ||
                gameState.gameData?.Status !== 1
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
              <>
                <div className="bg-gray-800 p-2 rounded">
                  Game Status:{" "}
                  {gameState.gameData.Status === 0
                    ? "Waiting for players"
                    : gameState.gameData.Status === 1
                      ? "In progress"
                      : "Finished"}
                </div>
                <Button onClick={getGameInfo} className="w-full bg-blue-600 hover:bg-blue-700">
                  Refresh Game Info
                </Button>
              </>
            )}
            <Button onClick={getActiveGames} className="w-full bg-purple-600 hover:bg-purple-700">
              Get Active Games
            </Button>
          </div>
        </div>

        {/* Game board */}
        <div className="w-3/4 bg-gray-900 rounded-lg p-4">
          <div className="relative w-full h-full">
            <Image src="/images/tablero.svg" alt="Tablero de OcaGo" layout="fill" objectFit="contain" />
            {gameState.gameData && (
              <>
                {/* Player 1 token */}
                <div
                  className="absolute w-6 h-6 bg-red-600 rounded-full border-2 border-white"
                  style={{
                    left: `${(POSITION_COORDINATES[gameState.gameData.Player1Position]?.x || 0) * (100 / 12)}%`,
                    top: `${(POSITION_COORDINATES[gameState.gameData.Player1Position]?.y || 0) * (100 / 9)}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                  }}
                />
                {/* Player 2 token */}
                {gameState.gameData.Player2Id && (
                  <div
                    className="absolute w-6 h-6 bg-blue-600 rounded-full border-2 border-white"
                    style={{
                      left: `${(POSITION_COORDINATES[gameState.gameData.Player2Position]?.x || 0) * (100 / 12)}%`,
                      top: `${(POSITION_COORDINATES[gameState.gameData.Player2Position]?.y || 0) * (100 / 9)}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: 10,
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

