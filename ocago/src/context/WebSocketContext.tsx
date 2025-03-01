"use client"

import type React from "react"
import { createContext, type ReactNode, useContext, useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/context/AuthContext"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Friend {
  id: string
  nickname: string
  status: number
  avatarUrl?: string
}

interface WebSocketContextType {
  socket: WebSocket | null
  sendMessage: (message: object) => void
  sendInvitation: (receiverId: string) => void
  respondInvitation: (matchRequestId: string, accepted: boolean) => void
  friendRequests: Friend[]
  friends: Friend[]
  fetchPendingRequests: () => void
  fetchFriends: () => void
  isConnected: boolean
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null)

// Crear una instancia global del WebSocket fuera del componente
// para que persista durante los refrescos de desarrollo
let globalWsInstance: WebSocket | null = null

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter()
  const { userId, userInfo } = useAuth()
  const socketRef = useRef<WebSocket | null>(null)
  const [friendRequests, setFriendRequests] = useState<Friend[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [activeMatchRequestId, setActiveMatchRequestId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const messageQueue = useRef<object[]>([])
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_INTERVAL = 2000 // 2 segundos entre intentos

  // Función para enviar mensajes
  const sendMessage = useCallback((message: object) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.log("⏳ Socket no disponible o no está abierto. Mensaje en cola:", message)
      messageQueue.current.push(message)
      return
    }

    try {
      const jsonMessage = JSON.stringify(message)
      socketRef.current.send(jsonMessage)
      console.log("📨 Mensaje enviado:", jsonMessage)
    } catch (error) {
      console.error("⚠️ Error al enviar el mensaje WebSocket:", error)
      messageQueue.current.push(message)
    }
  }, [])

  // Definir respondInvitation antes de handleWebSocketMessages
  const respondInvitation = useCallback(
    (matchRequestId: string, accepted: boolean) => {
      if (!userId || !userInfo) {
        console.error("⚠️ No hay información de usuario para responder a la invitación")
        return
      }

      const responseMessage = {
        Type: "respondInvitation",
        SenderId: String(userId),
        MatchRequestId: matchRequestId,
        Accepted: accepted,
      }

      console.log("🔍 Enviando respuesta a invitación:", responseMessage)
      sendMessage(responseMessage)

      if (accepted) {
        console.log(`⏱️ Esperando confirmación del servidor para invitación: ${matchRequestId}`)
        toast.info("Procesando respuesta...", { duration: 3000 })
      }
    },
    [userId, userInfo, sendMessage],
  )

  // Función para manejar los mensajes del WebSocket
  const handleWebSocketMessages = useCallback(
    (data: string) => {
      try {
        const message = JSON.parse(data)
        console.log("📩 Mensaje recibido:", message) // Log all incoming messages

        switch (
          message.Type // Convert to lowercase for case-insensitive comparison
        ) {
          case "pendingfriendrequests":
            setFriendRequests(
              message.Requests?.map((req: any) => ({
                id: String(req.Id),
                nickname: req.Nickname,
              })) || [],
            )
            break
          case "sendfriendrequest":
            console.log("📩 Solicitud de amistad recibida:", message)

            if (!message.SenderId) {
              console.error("⚠️ Error: SenderId es undefined en sendFriendRequest:", message)
              return
            }

            toast.custom(
              () => (
                <div className="flex flex-col bg-[#1B0F40] text-white p-4 rounded-lg">
                  <p className="text-white">
                    📩 Has recibido una solicitud de amistad de <strong>{message.SenderNickname}</strong>
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="bg-green-500 text-white px-4 py-2 rounded"
                      onClick={() => {
                        sendMessage({
                          Type: "respondFriendRequest",
                          SenderId: String(userInfo?.id),
                          ReceiverId: String(message.SenderId),
                          Accepted: true, // Aceptar solicitud
                        })
                        toast.dismiss()
                      }}
                    >
                      Aceptar
                    </button>
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded"
                      onClick={() => {
                        sendMessage({
                          Type: "respondFriendRequest",
                          SenderId: String(userInfo?.id),
                          ReceiverId: String(message.SenderId),
                          Accepted: false, // Rechazar solicitud
                        })
                        toast.dismiss()
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ),
              { duration: 10000 },
            )

            break
          case "friendslist":
            setFriends(
              message.Friends?.map((friend: any) => ({
                id: String(friend.Id),
                nickname: friend.Nickname,
                status: friend.Status,
                avatarUrl: friend.avatarUrl,
              })) || [],
            )
            break
          case "invitationsent":
            console.log("📨 Invitación enviada:", message)
            if (message.MatchRequestId) {
              setActiveMatchRequestId(message.MatchRequestId)
              toast.success("Invitación enviada correctamente", { duration: 3000 })
              router.push(`/sala/${message.MatchRequestId}`)
            } else {
              console.error("⚠️ No se recibió MatchRequestId en invitationSent")
            }
            break

          case "invitationreceived":
            console.log("📩 Invitación recibida:", message)
            if (!message.MatchRequestId) {
              console.error("⚠️ Error: MatchRequestId es undefined en invitationReceived:", message)
              return
            }
            toast.custom(
              () => (
                <div className="flex flex-col bg-[#1B0F40] text-white p-4 rounded-lg">
                  <p className="text-white">
                    🎮 Invitación de partida de <strong>{message.HostNickname}</strong>
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="bg-green-500 text-white px-4 py-2 rounded"
                      onClick={() => {
                        respondInvitation(message.MatchRequestId, true)
                        console.log("🎮 Aceptando invitación y redirigiendo a la sala:", message.MatchRequestId)
                        router.push(`/sala/${message.MatchRequestId}`)
                        toast.dismiss()
                      }}
                    >
                      Aceptar
                    </button>
                    <button
                      className="bg-red-500 text-white px-4 py-2 rounded"
                      onClick={() => {
                        respondInvitation(message.MatchRequestId, false)
                        toast.dismiss()
                      }}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ),
              { duration: 10000 },
            )
            break

          case "invitationresponse":
            console.log("📩 Respuesta a invitación recibida:", message)
            if (message.Accepted) {
              toast.success(`${message.GuestNickname} ha aceptado tu invitación`, { duration: 5000 })
              router.push(`/sala/${message.MatchRequestId}`)
            } else {
              toast.error(`${message.GuestNickname} ha rechazado tu invitación`, { duration: 5000 })
            }
            break

          case "playerjoined":
            console.log("👤 Jugador se unió a la sala:", message)
            toast.success(`${message.Nickname} se ha unido a la sala`, { duration: 3000 })
            // You might want to update the players list here
            break

          case "gamestarted":
            console.log("🎮 La partida ha comenzado:", message)
            toast.success("¡La partida ha comenzado!", { duration: 5000, icon: "🚀" })
            if (message.GameId) {
              router.push(`/game/${message.GameId}`)
            }
            break

          default:
            console.log("📩 Mensaje no manejado:", message)
            break
        }
      } catch (error) {
        console.error("⚠️ Error procesando el mensaje WebSocket", error)
      }
    },
    [router, respondInvitation, userInfo?.id, sendMessage],
  )

  // Función para procesar mensajes en cola
  const processQueue = useCallback(() => {
    if (messageQueue.current.length > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log(`🔄 Procesando ${messageQueue.current.length} mensajes en cola`)

      const queueCopy = [...messageQueue.current]
      messageQueue.current = []

      queueCopy.forEach((message) => {
        try {
          const jsonMessage = JSON.stringify(message)
          socketRef.current?.send(jsonMessage)
          console.log("📨 Mensaje encolado enviado:", message)
        } catch (error) {
          console.error("⚠️ Error al enviar mensaje encolado:", error)
          messageQueue.current.push(message)
        }
      })
    }
  }, [])

  // Función para conectar el WebSocket
  const connectWebSocket = useCallback(() => {
    if (!userId) return null

    // Si ya hay una conexión global, la usamos
    if (globalWsInstance && globalWsInstance.readyState === WebSocket.OPEN) {
      console.log("🔄 Reutilizando conexión WebSocket existente")
      return globalWsInstance
    }

    // Si hay una conexión global pero no está abierta, la cerramos
    if (globalWsInstance && globalWsInstance.readyState !== WebSocket.CLOSED) {
      try {
        globalWsInstance.close()
      } catch (e) {
        console.warn("⚠️ Error al cerrar la conexión WebSocket antigua:", e)
      }
    }

    console.log("🔌 Iniciando nueva conexión WebSocket")
    // Use the correct WebSocket server URL with port 7107
    const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`)
    globalWsInstance = ws

    ws.onopen = () => {
      console.log("✅ WebSocket Connected")
      setIsConnected(true)
      reconnectAttemptsRef.current = 0
      toast.success("Conectado al servidor", { duration: 3000, icon: "🌐" })

      // Procesar mensajes en cola después de la conexión
      setTimeout(() => {
        processQueue()

        // Obtenemos datos iniciales
        sendMessage({ Type: "getPendingFriendRequests", UserId: String(userId) })
        sendMessage({ Type: "getFriends", SenderId: String(userId) })
      }, 100)
    }

    ws.onmessage = (event) => handleWebSocketMessages(event.data)

    ws.onclose = (event) => {
      console.log("❌ WebSocket Disconnected", event.code, event.reason)
      setIsConnected(false)

      // Handle code 1006 specifically
      if (event.code === 1006) {
        console.log("🔄 Connection closed abnormally (1006), attempting immediate reconnect")
        toast.error("Conexión interrumpida. Reconectando...", { duration: 3000, icon: "🔌" })

        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        // Attempt immediate reconnect for 1006 errors
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, 1000)

        return
      }

      // No intentamos reconectar si fue un cierre limpio (código 1000)
      if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        console.log(`🔄 Intentando reconexión ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS}...`)

        // Limpieza de timeout anterior si existe
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        // Programamos reconexión con backoff exponencial
        const delay = RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttemptsRef.current)
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current++
          connectWebSocket()
        }, delay)
      } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        toast.error("No se pudo reconectar al servidor", { duration: 5000, icon: "🔌" })
      } else {
        console.log("Cierre normal del WebSocket, no se intenta reconexión")
      }
    }

    ws.onerror = (error) => {
      console.error("⚠️ WebSocket Error", error)
      // No mostramos toast en cada error para no saturar la interfaz
      // El manejo de reconexión se hace en onclose
    }

    return ws
  }, [userId, handleWebSocketMessages, processQueue, sendMessage])

  // Efecto para inicializar y gestionar el WebSocket
  useEffect(() => {
    if (!userId) return

    // Conectar el WebSocket
    const ws = connectWebSocket()
    if (ws) {
      socketRef.current = ws
    }

    // Verificar el estado de la conexión periódicamente
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        // Podemos enviar un ping o simplemente verificar el estado
        processQueue() // Procesar mensajes en cola por si acaso
      } else if (socketRef.current && socketRef.current.readyState !== WebSocket.CONNECTING) {
        // Si no está conectado ni conectando, intentamos reconectar
        console.log("💓 Heartbeat: WebSocket no está conectado, intentando reconexión")
        const ws = connectWebSocket()
        if (ws) {
          socketRef.current = ws
        }
      }
    }, 30000) // Cada 30 segundos

    // Add a ping/pong mechanism to keep the connection alive
    const pingInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          // Send a ping message to keep the connection alive
          sendMessage({ Type: "ping", SenderId: String(userId) })
          console.log("💓 Ping sent to keep connection alive")
        } catch (e) {
          console.warn("⚠️ Error sending ping:", e)
        }
      }
    }, 15000) // Every 15 seconds

    // Evento de visibilidad para reconectar cuando la página vuelve a ser visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("📱 Página visible, verificando conexión WebSocket")
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
          console.log("🔄 Reconectando WebSocket al volver a la página")
          const ws = connectWebSocket()
          if (ws) {
            socketRef.current = ws
          }
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Efecto para manejar la desconexión antes de descargar la página
    const handleBeforeUnload = () => {
      if (socketRef.current) {
        // Enviamos un mensaje de cierre limpio si es necesario
        try {
          sendMessage({ Type: "userDisconnecting", UserId: String(userId) })
        } catch (e) {
          // Ignoramos errores al enviar el mensaje de cierre
        }
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    // Limpiar todo al desmontar
    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(pingInterval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("beforeunload", handleBeforeUnload)

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      // No cerramos la conexión global para que persista
      // Solo hacemos null la referencia local
      socketRef.current = null
    }
  }, [userId, connectWebSocket, processQueue, sendMessage])

  // Funciones adicionales
  const fetchPendingRequests = useCallback(() => {
    if (userId) {
      sendMessage({ Type: "getPendingFriendRequests", UserId: String(userId) })
    }
  }, [userId, sendMessage])

  const fetchFriends = useCallback(() => {
    if (userId) {
      sendMessage({ Type: "getFriends", SenderId: String(userId) })
    }
  }, [userId, sendMessage])

  const sendInvitation = useCallback(
    (receiverId: string) => {
      if (!userId) return
      sendMessage({
        Type: "sendInvitation",
        SenderId: String(userId),
        ReceiverId: receiverId,
        HostNickname: userInfo?.nickname || String(userId),
      })
    },
    [userId, userInfo, sendMessage],
  )

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        sendMessage,
        sendInvitation,
        respondInvitation,
        friendRequests,
        friends,
        fetchPendingRequests,
        fetchFriends,
        isConnected,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider")
  }
  return context
}

