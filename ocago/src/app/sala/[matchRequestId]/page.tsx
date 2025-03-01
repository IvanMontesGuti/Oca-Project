"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useWebSocket } from "@/context/WebSocketContext"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/endpoints/config"
import { Crown, X } from "lucide-react"
import { toast } from "sonner"
import { Header2 } from "@/components/Home/navUser"

interface Player {
  id: string
  nickname: string
  avatarUrl?: string
  isReady: boolean
  isHost: boolean
}

export default function GameRoom() {
  const { matchRequestId } = useParams()
  const router = useRouter()
  const { sendMessage, socket } = useWebSocket()
  const { userInfo } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [gameId, setGameId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!userInfo?.id || !matchRequestId) {
      router.push("/")
      return
    }

    // Add a check for socket connection
    if (!socket) {
      console.error("WebSocket connection not available")
      toast.error("Error de conexión. Intentando reconectar...", {
        duration: 3000,
        icon: "🔌",
      })
      return
    }

    sendMessage({
      type: "getRoomInfo",
      senderId: String(userInfo.id),
      matchRequestId: String(matchRequestId),
    })

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data)

        // Handle ping response if needed
        if (message.Type === "pong") {
          console.log("💓 Pong received from server")
          return
        }

        switch (message.Type) {
          case "roomInfo":
            setPlayers(
              message.Players.map((player: any) => ({
                id: String(player.Id),
                nickname: player.Nickname,
                avatarUrl: player.AvatarUrl,
                isReady: player.IsReady || false,
                isHost: player.IsHost || false,
              })),
            )
            setGameId(message.GameId)
            setIsLoading(false)
            break

          case "playerReady":
            setPlayers((prev) =>
              prev.map((player) => (player.id === String(message.PlayerId) ? { ...player, isReady: true } : player)),
            )
            break

          case "playerLeft":
            toast.error(`${message.Nickname} ha abandonado la sala`, {
              duration: 3000,
              icon: "🚪",
            })
            setTimeout(() => router.push("/"), 2000)
            break

          case "allPlayersReady":
            setCountdown(5)
            break

          case "gameStarting":
            if (gameId) {
              toast.success("¡La partida está comenzando!", {
                duration: 3000,
                icon: "🎮",
              })
              //¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡¡Importante!!!!!!!!!!!!!!!!!!!!!!!!!!
              router.push(`/game/${gameId}`)
            }
            break
        }
      } catch (error) {
        console.error("Error al procesar mensaje:", error)
      }
    }

    const handleSocketError = (error: Event) => {
      console.error("Error en la conexión WebSocket:", error)
      toast.error("Error de conexión. Intentando reconectar...", {
        duration: 3000,
        icon: "🔌",
      })
    }

    if (socket) {
      socket.addEventListener("message", handleMessage)
      socket.addEventListener("error", handleSocketError)
    }

    return () => {
      if (socket) {
        socket.removeEventListener("message", handleMessage)
        socket.removeEventListener("error", handleSocketError)
      }
    }
  }, [userInfo, matchRequestId, sendMessage, socket, router, gameId])

  useEffect(() => {
    if (countdown === null) return
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleReadyConfirmation = (accepted: boolean) => {
    if (!userInfo?.id) return

    sendMessage({
      type: "confirmReady",
      senderId: String(userInfo.id),
      matchRequestId: String(matchRequestId),
      Accepted: accepted,
    })

    if (!accepted) {
      router.push("/")
    }
  }

  const handleLeaveRoom = () => {
    if (!userInfo?.id) return

    sendMessage({
      type: "leaveRoom",
      senderId: String(userInfo.id),
      matchRequestId: String(matchRequestId),
    })

    router.push("/")
  }

  const currentPlayer = players.find((player) => player.id === String(userInfo?.id))
  const isCurrentPlayerReady = currentPlayer?.isReady || false
  const areAllPlayersReady = players.length === 2 && players.every((player) => player.isReady)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex flex-col items-center justify-center p-4">
      <Header2 />
      <div className="w-full max-w-4xl bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-purple-500/20">
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Sala de Juego</h1>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-red-500/20"
              onClick={handleLeaveRoom}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`relative bg-gradient-to-r ${index === 0 ? "from-blue-900/40 to-blue-700/20" : "from-red-900/40 to-red-700/20"} rounded-xl p-6 transition-all duration-300 ${player.isReady ? "ring-2 ring-green-500" : ""}`}
                  >
                    {player.isHost && (
                      <div className="absolute top-3 left-3 bg-yellow-500 text-black p-2 rounded-full shadow-md">
                        <Crown className="h-5 w-5" />
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16 ring-2 ring-white/20">
                        <AvatarImage
                          src={player.avatarUrl ? `${API_BASE_URL}/${player.avatarUrl}` : undefined}
                          alt={player.nickname}
                        />
                        <AvatarFallback>{player.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="text-xl font-bold text-white">{player.nickname}</h3>
                        <p className="text-gray-300">
                          {player.isReady ? "Listo para jugar" : "Esperando confirmación..."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

