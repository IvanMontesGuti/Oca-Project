"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Dice5, Trophy, Clock } from "lucide-react"

// Define types for our WebSocket messages
type WebSocketMessage = {
  Action: "CreateGame" | "JoinGame" | "Surrender" | "MakeMove" | "GetGame" | "GetActiveGames" | "SendMessage"
  GameId?: string
  Message?: string
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

export default function WebSocketGame() {
  const [username, setUsername] = useState<string>("")
  const [gameIdInput, setGameIdInput] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false)
  const [inactivityTimer, setInactivityTimer] = useState<number>(120) // 2 minutes in seconds
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
      }

      // Handle other response types
      if (response.activeGames) {
        setGameState((prev) => ({ ...prev, activeGames: response.activeGames }))
      }

      if (response.message) {
        setGameState((prev) => ({
          ...prev,
          messages: [...prev.messages, { sender: response.sender || "System", text: response.message }],
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
        Action: "SendMessage",
        GameId: gameState.gameData.Id,
        Message: message,
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

  // Generate board cells
  const renderBoardCells = () => {
    const cells = []
    const totalCells = 63

    // Special cells with images (simplified for this example)
    const specialCells = [1, 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]

    for (let i = 1; i <= totalCells; i++) {
      const isSpecial = specialCells.includes(i)
      const isPlayer1Here = gameState.gameData?.Player1Position === i
      const isPlayer2Here = gameState.gameData?.Player2Position === i

      cells.push(
        <div
          key={i}
          className={`relative flex items-center justify-center border border-black text-sm
            ${isSpecial ? "bg-pink-500" : "bg-yellow-400"}
            ${i === 63 ? "col-span-2 row-span-2" : ""}`}
        >
          {i}
          {isSpecial && (
            <div className="absolute inset-0 flex items-center justify-center opacity-70">
              <img src={`/placeholder.svg?height=30&width=30`} alt="Special" className="w-full h-full object-contain" />
            </div>
          )}
          {isPlayer1Here && (
            <div className="absolute top-0 left-0 w-4 h-4 bg-red-600 rounded-full border-2 border-white"></div>
          )}
          {isPlayer2Here && (
            <div className="absolute top-0 right-0 w-4 h-4 bg-blue-600 rounded-full border-2 border-white"></div>
          )}
        </div>,
      )
    }

    return cells
  }

  // Winner modal
  const WinnerModal = () => {
    if (!showWinnerModal || !gameState.gameData?.Winner) return null

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-purple-900 p-8 rounded-lg max-w-md w-full text-center animate-bounce">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-3xl font-bold mb-4">¡Ganador!</h2>
          <p className="text-2xl mb-6">{gameState.gameData.Winner}</p>
          <Button onClick={() => setShowWinnerModal(false)} className="bg-yellow-400 text-black hover:bg-yellow-500">
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
          <div className="relative grid grid-cols-8 grid-rows-8 gap-1 h-full">
            {renderBoardCells()}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-yellow-400 rounded-full p-8 text-blue-900 font-bold text-4xl">OcaGo!</div>
            </div>
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


