"use client"

import { useState, useEffect, useRef } from "react"
import useWebSocket from "react-use-websocket"
import { Button } from "@/components/ui/button"
import Tablero from "@/components/tablero"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/context/AuthContext"
import { MessageCircle, Send, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface DecodedToken {
  email: string
  role: string
  unique_name: string
  family_name?: string
  nbf: number
  exp: number
  iat: number
  id: number
}

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  message: string
  timestamp: Date
}

export default function GameBoard() {
  const { userInfo } = useAuth()

  const { unique_name } = userInfo || {}
  // Fix userId extraction - make sure it's properly cast to string
  const userId = userInfo?.id ? String(userInfo.id) : userInfo?.unique_name

  // Add this near the top of your component
  const [wsConnected, setWsConnected] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const [isGameStarted, setIsGameStarted] = useState(false)

  // Change this line to match your actual WebSocket server URL
  const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`

  const [gameId, setGameId] = useState<string | null>(null)
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentTurn, setCurrentTurn] = useState<string | null>(null)
  const [remainingTurns, setRemainingTurns] = useState<Record<string, number>>({})
  const [winner, setWinner] = useState<string | null>(null)
  const [showWinModal, setShowWinModal] = useState(false)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [isDiceRolling, setIsDiceRolling] = useState(false)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Turn counter and timer
  const [turnNumber, setTurnNumber] = useState(1)
  const [turnTimer, setTurnTimer] = useState(30)
  const [showTurnAnimation, setShowTurnAnimation] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Then update your WebSocket configuration
  const { sendMessage, lastMessage } = useWebSocket(wsUrl, {
    onOpen: () => {
      console.log("WebSocket conectado")
      setWsConnected(true)
      setWsError(null)
    },
    onError: (error) => {
      console.error("Error de WebSocket:", error)
      setWsConnected(false)
      setWsError("Error de conexión al servidor de juego. Intente nuevamente.")
    },
    onClose: () => {
      console.log("WebSocket desconectado")
      setWsConnected(false)
    },
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    retryOnError: true,
    shouldReconnect: () => true,
  })

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Turn timer effect
  useEffect(() => {
    if (currentTurn && gameId && isGameStarted) {
      // Reset timer when turn changes
      setTurnTimer(30)

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Start new timer
      timerRef.current = setInterval(() => {
        setTurnTimer((prev) => {
          if (prev <= 1) {
            // Time's up - could trigger auto-move or skip turn
            clearInterval(timerRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Show turn animation
      setShowTurnAnimation(true)
      setTimeout(() => setShowTurnAnimation(false), 2000)

      // Increment turn number
      setTurnNumber((prev) => prev + 1)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentTurn, gameId, isGameStarted])

  // Procesar mensajes WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data)
        console.log("📩 Mensaje WebSocket recibido:", data)

        if (data.action === "gameUpdate") {
          setGameId(data.data.Id)
          actualizarFichas(data.data)

          // Fix: Use comparison (==) instead of assignment (=)
          if (data.data.IsPlayer1Turn === true) {
            setCurrentTurn(data.data.Player1Id)
          } else {
            setCurrentTurn(data.data.Player2Id)
          }
          // Actualizar turnos restantes
          const turnsRemaining: Record<string, number> = {}
          if (data.data.Player1Id) {
            turnsRemaining[data.data.Player1Id] = data.data.Player1RemainingTurns
          }
          if (data.data.Player2Id) {
            turnsRemaining[data.data.Player2Id] = data.data.Player2RemainingTurns
          }
          setRemainingTurns(turnsRemaining)

          // Verificar si hay un ganador
          if (data.data.WinnerId) {
            setWinner(data.data.WinnerId)
            setGameStats({
              winnerId: data.data.WinnerId,
              totalMoves: data.data.TotalMoves || 0,
              gameTime: data.data.GameTime || 0,
              player1Moves: data.data.Player1Moves || 0,
              player2Moves: data.data.Player2Moves || 0,
            })
            setShowWinModal(true)
          }
        } else if (data.action === "moveUpdate") {
          // Actualizar el valor del dado
          if (data.data.DiceValue) {
            console.log("🎲 Dado recibido:", data.data.DiceValue)
            animateDiceRoll(data.data.DiceValue)
          }

          // Update the position immediately for the opponent's move
          if (data.data.PlayerId !== userId) {
            // Update the position in state right away
            setFichas((prevFichas) =>
              prevFichas.map((ficha) =>
                ficha.playerId === data.data.PlayerId
                  ? {
                      ...ficha,
                      position: data.data.NewPosition,
                      casillaX: casillas[data.data.NewPosition].casillaX,
                      casillaY: casillas[data.data.NewPosition].casillaY,
                    }
                  : ficha,
              ),
            )
          }

          // Después de que termine la animación del dado, mover la ficha
          setTimeout(() => {
            // Only animate your own piece movement
            if (data.data.PlayerId === userId) {
              animateMovement(data.data.PlayerId, data.data.NewPosition)
            }

            // Actualizar turnos restantes si están disponibles
            if (data.data.PlayerId && data.data.RemainingTurns !== undefined) {
              setRemainingTurns((prevTurns) => ({
                ...prevTurns,
                [data.data.PlayerId]: data.data.RemainingTurns,
              }))
            }
          }, 2500) // Tiempo más largo para la animación del dado
        } else if (data.action === "chatMessage") {
          // Procesar mensajes de chat
          addChatMessage(data.data.playerId, data.data.playerName || data.data.playerId, data.data.message)
        }
      } catch (error) {
        console.error("Error al procesar mensaje:", error)
      }
    }
  }, [lastMessage])

  interface Casilla {
    casillaX: number
    casillaY: number
    playerId?: string
  }

  interface Ficha {
    playerId: string
    casillaX: number
    casillaY: number
    position: number
    color: string
  }

  interface GameData {
    Id: string
    Player1Id: string
    Player1Position: number | null
    Player2Id: string
    Player2Position: number | null
    CurrentTurnPlayerId: string
    Player1RemainingTurns: number
    Player2RemainingTurns: number
    WinnerId?: string
    TotalMoves?: number
    GameTime?: number
    Player1Moves?: number
    Player2Moves?: number
  }

  interface GameStats {
    winnerId: string
    totalMoves: number
    gameTime: number
    player1Moves: number
    player2Moves: number
  }

  const casillas: Record<number, Casilla> = {
    1: { casillaX: 3, casillaY: 7 },
    2: { casillaX: 4, casillaY: 7 },
    3: { casillaX: 5, casillaY: 7 },
    4: { casillaX: 6, casillaY: 7 },
    5: { casillaX: 7, casillaY: 7 },
    6: { casillaX: 8, casillaY: 7 },
    7: { casillaX: 9, casillaY: 7 },
    8: { casillaX: 10, casillaY: 7 },
    9: { casillaX: 11, casillaY: 7 },
    10: { casillaX: 11, casillaY: 6 },
    11: { casillaX: 11, casillaY: 5 },
    12: { casillaX: 11, casillaY: 4 },
    13: { casillaX: 11, casillaY: 3 },
    14: { casillaX: 11, casillaY: 2 },
    15: { casillaX: 11, casillaY: 1 },
    16: { casillaX: 11, casillaY: 0 },
    17: { casillaX: 10, casillaY: 0 },
    18: { casillaX: 9, casillaY: 0 },
    19: { casillaX: 8, casillaY: 0 },
    20: { casillaX: 7, casillaY: 0 },
    21: { casillaX: 6, casillaY: 0 },
    22: { casillaX: 5, casillaY: 0 },
    23: { casillaX: 4, casillaY: 0 },
    24: { casillaX: 3, casillaY: 0 },
    25: { casillaX: 2, casillaY: 0 },
    26: { casillaX: 1, casillaY: 0 },
    27: { casillaX: 0, casillaY: 0 },
    28: { casillaX: 0, casillaY: 1 },
    29: { casillaX: 0, casillaY: 2 },
    30: { casillaX: 0, casillaY: 3 },
    31: { casillaX: 0, casillaY: 4 },
    32: { casillaX: 0, casillaY: 5 },
    33: { casillaX: 0, casillaY: 6 },
    34: { casillaX: 1, casillaY: 6 },
    35: { casillaX: 2, casillaY: 6 },
    36: { casillaX: 3, casillaY: 6 },
    37: { casillaX: 4, casillaY: 6 },
    38: { casillaX: 5, casillaY: 6 },
    39: { casillaX: 6, casillaY: 6 },
    40: { casillaX: 7, casillaY: 6 },
    41: { casillaX: 8, casillaY: 6 },
    42: { casillaX: 9, casillaY: 6 },
    43: { casillaX: 10, casillaY: 6 },
    44: { casillaX: 10, casillaY: 5 },
    45: { casillaX: 10, casillaY: 4 },
    46: { casillaX: 10, casillaY: 3 },
    47: { casillaX: 10, casillaY: 2 },
    48: { casillaX: 10, casillaY: 1 },
    49: { casillaX: 9, casillaY: 1 },
    50: { casillaX: 8, casillaY: 1 },
    51: { casillaX: 7, casillaY: 1 },
    52: { casillaX: 6, casillaY: 1 },
    53: { casillaX: 5, casillaY: 1 },
    54: { casillaX: 4, casillaY: 1 },
    55: { casillaX: 3, casillaY: 1 },
    56: { casillaX: 2, casillaY: 1 },
    57: { casillaX: 1, casillaY: 1 },
    58: { casillaX: 1, casillaY: 2 },
    59: { casillaX: 1, casillaY: 3 },
    60: { casillaX: 1, casillaY: 4 },
    61: { casillaX: 1, casillaY: 5 },
    62: { casillaX: 2, casillaY: 5 },
    63: { casillaX: 4, casillaY: 5 },
  }

  const actualizarFichas = (data: GameData) => {
    const nuevasFichas: Ficha[] = []

    if (data.Player1Id && data.Player1Position !== null && casillas[data.Player1Position]) {
      nuevasFichas.push({
        playerId: data.Player1Id,
        casillaX: casillas[data.Player1Position].casillaX,
        casillaY: casillas[data.Player1Position].casillaY,
        position: data.Player1Position,
        color: "red",
      })
    }

    if (data.Player2Id && data.Player2Position !== null && casillas[data.Player2Position]) {
      nuevasFichas.push({
        playerId: data.Player2Id,
        casillaX: casillas[data.Player2Position].casillaX,
        casillaY: casillas[data.Player2Position].casillaY,
        position: data.Player2Position,
        color: "blue",
      })
    }

    setFichas(nuevasFichas)
  }

  const animateDiceRoll = (finalValue: number) => {
    setIsDiceRolling(true)

    // Simulamos la animación del dado cambiando rápidamente su valor
    let count = 0
    const intervalTime = 150 // 150ms entre cambios (más lento)
    const totalTime = 2500 // 2.5 segundos en total (más lento)
    const totalSteps = totalTime / intervalTime

    const diceInterval = setInterval(() => {
      // Valores aleatorios mientras gira
      if (count < totalSteps - 1) {
        setDiceValue(Math.floor(Math.random() * 6) + 1)
      } else {
        // Valor final
        setDiceValue(finalValue)
        clearInterval(diceInterval)
        setIsDiceRolling(false)
      }
      count++
    }, intervalTime)
  }

  const animateMovement = (playerId: string, newPosition: number) => {
    if (!casillas[newPosition]) return

    const fichaActual = fichas.find((f) => f.playerId === playerId)
    if (!fichaActual) return

    setIsAnimating(true)

    const posicionInicial = fichaActual.position
    const path: number[] = []

    // Crear un camino desde la posición actual hasta la nueva
    for (let i = posicionInicial + 1; i <= newPosition; i++) {
      if (casillas[i]) {
        path.push(i)
      }
    }

    // Animar el movimiento a través del camino
    let step = 0
    const animateStep = () => {
      if (step < path.length) {
        const currentPos = path[step]

        setFichas((prevFichas) =>
          prevFichas.map((f) =>
            f.playerId === playerId
              ? {
                  ...f,
                  casillaX: casillas[currentPos].casillaX,
                  casillaY: casillas[currentPos].casillaY,
                  position: currentPos,
                }
              : f,
          ),
        )

        step++
        setTimeout(animateStep, 500) // Movimiento más lento (500ms)
      } else {
        // Actualizar a la posición final
        setFichas((prevFichas) =>
          prevFichas.map((f) =>
            f.playerId === playerId
              ? {
                  ...f,
                  casillaX: casillas[newPosition].casillaX,
                  casillaY: casillas[newPosition].casillaY,
                  position: newPosition,
                }
              : f,
          ),
        )

        setIsAnimating(false)
      }
    }

    // Iniciar la animación
    animateStep()
  }

  // Add this function to your component
  const sendMessageWithFallback = (message: string) => {
    try {
      if (wsConnected) {
        sendMessage(message)
      } else {
        // Fallback to regular HTTP request
        fetch("http://localhost:7107/api/game/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: message,
        })
          .then((response) => response.json())
          .then((data) => {
            // Handle the response manually
            console.log("Fallback response:", data)
            // Process the data similar to how you process WebSocket messages
          })
          .catch((error) => {
            console.error("Fallback error:", error)
          })
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const rollDice = () => {
    if (gameId && !isAnimating && !isDiceRolling) {
      sendMessageWithFallback(JSON.stringify({ Action: "MakeMove", GameId: gameId }))
    }
  }

  const createGame = () => {
    sendMessageWithFallback(JSON.stringify({ Action: "CreateGame" }))
  }

  // New function to start the game
  const startGame = () => {
    if (gameId && !isGameStarted) {
      // You might need to adjust this action name based on your backend
      sendMessageWithFallback(JSON.stringify({ Action: "StartGame", GameId: gameId }))
      setIsGameStarted(true)
    }
  }

  const resetGame = () => {
    setShowWinModal(false)
    setWinner(null)
    setGameStats(null)
    setGameId(null)
    setFichas([])
    setDiceValue(null)
    setChatMessages([])
    setTurnNumber(1)
    setIsGameStarted(false)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" + secs : secs}`
  }

  // Determinar el color del jugador
  const getPlayerColor = (playerId: string): string => {
    const ficha = fichas.find((f) => f.playerId === playerId)
    return ficha?.color || "gray"
  }

  // Añadir mensaje al chat
  const addChatMessage = (playerId: string, playerName: string, message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      playerName,
      message,
      timestamp: new Date(),
    }

    setChatMessages((prev) => [...prev, newMessage])
  }

  // Enviar mensaje de chat
  const sendChatMessage = () => {
    if (!chatInput.trim() || !gameId) return

    sendMessageWithFallback(
      JSON.stringify({
        Action: "SendChatMessage",
        GameId: gameId,
        Message: chatInput,
      }),
    )

    // Añadir mensaje localmente (el servidor también lo enviará a todos)
    addChatMessage(userId || "unknown", unique_name || userId || "unknown", chatInput)

    // Limpiar input
    setChatInput("")
  }

  // Renderizar cara del dado según el valor
  const renderDiceFace = (value: number | null) => {
    if (value === null) return null

    const dots = []

    // Configuración de puntos según el valor del dado
    switch (value) {
      case 1:
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>)
        break
      case 2:
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        break
      case 3:
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        break
      case 4:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        break
      case 5:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        break
      case 6:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(
          <div
            key="middle-left"
            className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 bg-black rounded-full"
          ></div>,
        )
        dots.push(
          <div
            key="middle-right"
            className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 bg-black rounded-full"
          ></div>,
        )
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>)
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>)
        break
      default:
        break
    }

    return (
      <div className={`relative w-16 h-16 bg-white rounded-lg shadow-lg ${isDiceRolling ? "animate-bounce" : ""}`}>
        {dots}
      </div>
    )
  }

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col items-center p-4">
      <div className="text-white/80 text-sm mb-4">ID Partida: {gameId || "Sin partida"}</div>

      {wsError && (
        <div className="bg-red-500/80 text-white px-4 py-2 rounded-lg mb-4 max-w-4xl">
          {wsError}
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="ml-4 bg-white/20 hover:bg-white/30 text-white"
          >
            Reconectar
          </Button>
        </div>
      )}

      {!wsConnected && !wsError && (
        <div className="bg-yellow-500/80 text-white px-4 py-2 rounded-lg mb-4 max-w-4xl">
          Conectando al servidor de juego...
        </div>
      )}

      {/* Animación de turno */}
      {showTurnAnimation && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-black/70 text-white text-6xl font-bold rounded-full w-40 h-40 flex items-center justify-center animate-scale-fade">
            Turno {turnNumber}
          </div>
        </div>
      )}

      {gameId && (
        <div className="bg-black/50 p-3 rounded-lg mb-4 w-full max-w-4xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {currentTurn && isGameStarted ? (
                <>
                  <div
                    className={`w-4 h-4 rounded-full ${currentTurn === userId ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: getPlayerColor(currentTurn) }}
                  ></div>
                  <div className="text-white font-medium">
                    Turno de: {currentTurn}
                    {currentTurn === userId && " (Tu turno)"}
                  </div>
                </>
              ) : (
                <div className="text-white font-medium">
                  {isGameStarted ? "Esperando jugadores..." : "Partida lista para comenzar"}
                </div>
              )}
            </div>

            {isGameStarted && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-white/70" />
                <div className={`text-white font-medium ${turnTimer <= 10 ? "text-red-500 animate-pulse" : ""}`}>
                  {turnTimer}s
                </div>
                <Progress value={(turnTimer / 30) * 100} className="w-24 h-2" />
              </div>
            )}

            <div className="flex gap-6">
              {Object.entries(remainingTurns).map(([playerId, turns]) => (
                <div key={playerId} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlayerColor(playerId) }}></div>
                  <div className="text-white/80 text-sm">
                    {playerId}: {turns} turnos paralizado
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 w-full max-w-4xl">
        {/* Tablero y elementos del juego */}
        <div className="flex-1 relative">
          <Tablero fichas={fichas} />

          {/* Piezas animadas */}
          {fichas.map((ficha) => (
            <div
              key={ficha.playerId}
              className={`absolute w-6 h-6 rounded-full transition-all duration-500 ease-in-out ${isAnimating ? "animate-bounce" : ""}`}
              style={{
                backgroundColor: ficha.color,
                left: `calc(${(ficha.casillaX / 11) * 100}% - 12px)`,
                top: `calc(${(ficha.casillaY / 7) * 100}% - 12px)`,
                boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                zIndex: 10,
                transform: "translate(0, 0)",
                border: "2px solid white",
              }}
            ></div>
          ))}

          {/* Dado */}
          {diceValue !== null && (
            <div className="absolute bottom-4 right-4 flex flex-col items-center">
              <div className="text-white text-sm mb-2">Resultado:</div>
              <div className={`transform ${isDiceRolling ? "animate-spin" : ""}`}>{renderDiceFace(diceValue)}</div>
            </div>
          )}

          <div className="flex gap-4 mt-4 justify-center">
            {!gameId && (
              <Button
                onClick={createGame}
                disabled={!!gameId || isAnimating || isDiceRolling}
                className="bg-green-600 hover:bg-green-700"
              >
                Crear Partida
              </Button>
            )}

            {gameId && !isGameStarted && (
              <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 animate-pulse">
                Empezar Partida
              </Button>
            )}

            {gameId && isGameStarted && (
              <Button
                onClick={rollDice}
                disabled={!gameId || isAnimating || isDiceRolling || currentTurn !== userId}
                className={`bg-blue-600 hover:bg-blue-700 ${currentTurn === userId ? "animate-pulse" : ""}`}
              >
                {isDiceRolling ? "Lanzando..." : "Tirar Dado"}
              </Button>
            )}
          </div>

          {isAnimating && (
            <div className="mt-4 text-amber-400 font-medium animate-pulse text-center">Moviendo ficha...</div>
          )}
        </div>

        {/* Chat */}
        <div className="w-80 bg-black/40 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-slate-800 p-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-white/70" />
            <h3 className="text-white font-medium">Chat de Partida</h3>
            <Badge variant="secondary" className="ml-auto">
              Turno {turnNumber}
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-3 h-[400px]">
            {chatMessages.length === 0 ? (
              <div className="text-white/50 text-center text-sm p-4">No hay mensajes. ¡Sé el primero en escribir!</div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.playerId === userId ? "justify-end" : "justify-start"}`}
                  >
                    {msg.playerId !== userId && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ backgroundColor: getPlayerColor(msg.playerId) }}>
                          {msg.playerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`rounded-lg px-3 py-2 max-w-[80%] ${
                        msg.playerId === userId ? "bg-blue-600 text-white" : "bg-slate-700 text-white"
                      }`}
                    >
                      {msg.playerId !== userId && (
                        <div className="text-xs font-medium mb-1" style={{ color: getPlayerColor(msg.playerId) }}>
                          {msg.playerName}
                        </div>
                      )}
                      <div>{msg.message}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t border-slate-700">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                sendChatMessage()
              }}
            >
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button type="submit" size="icon" disabled={!chatInput.trim() || !gameId}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Victoria */}
      <Dialog open={showWinModal} onOpenChange={setShowWinModal}>
        <DialogContent className="sm:max-w-md bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">
              <span className="text-amber-400 text-2xl animate-bounce inline-block">¡Victoria!</span>
            </DialogTitle>
            <DialogDescription className="text-center text-white/80">
              El jugador{" "}
              <span className="font-bold text-white" style={{ color: getPlayerColor(winner || "") }}>
                {winner}
              </span>{" "}
              ha ganado la partida
            </DialogDescription>
          </DialogHeader>

          {gameStats && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-sm text-slate-400">Movimientos Totales</div>
                  <div className="text-xl font-bold">{gameStats.totalMoves}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-sm text-slate-400">Tiempo de Juego</div>
                  <div className="text-xl font-bold">{formatTime(gameStats.gameTime)}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm text-slate-400">Estadísticas por Jugador</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "red" }}></div>
                    <div className="text-sm">Jugador 1: {gameStats.player1Moves} movimientos</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "blue" }}></div>
                    <div className="text-sm">Jugador 2: {gameStats.player2Moves} movimientos</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={resetGame} className="w-full bg-amber-500 hover:bg-amber-600">
              Nueva Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}




