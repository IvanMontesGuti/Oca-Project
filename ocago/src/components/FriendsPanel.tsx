"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { API_BASE_URL, API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number // 0 for not friend, 1 for friend
}

interface FriendRequest {
  id: string
  senderId: string
  senderNickname: string
}

export default function FriendsPanel() {
  const { userInfo } = useAuth()
  const { sendFriendRequest, respondFriendRequest, friendRequests } = useWebSocket()
  const [friends, setFriends] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFriends = useCallback(async () => {
    if (!userInfo?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const url = searchQuery.trim() === "" ? FRIENDSHIP_GET_BY_ID_URL(userInfo.id) : API_SEARCH_URL(searchQuery)
      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al buscar usuarios")

      const data = await response.json()
      setFriends(data)
    } catch (error) {
      console.error("Error fetching friends:", error)
      setError("No se pudieron cargar los amigos o resultados de búsqueda.")
      setFriends([])
    } finally {
      setIsLoading(false)
    }
  }, [userInfo?.id, searchQuery])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends, friendRequests])

  const handleSendFriendRequest = (friendId: string) => {
    sendFriendRequest(friendId)
    // Actualizar la UI para reflejar que se ha enviado la solicitud
    setFriends(friends.map((friend) => (friend.id === friendId ? { ...friend, status: 2 } : friend)))
  }

  const handleAcceptRequest = (requestId: string) => {
    respondFriendRequest(requestId, true)
    // Actualizar la UI para reflejar que se ha aceptado la solicitud
    fetchFriends()
  }

  const handleRejectRequest = (requestId: string) => {
    respondFriendRequest(requestId, false)
  }

  const sendGameInvitation = (friendId: string) => {
    // Implementar la lógica para enviar una invitación de juego
    console.log(`Enviando invitación de juego al amigo con ID: ${friendId}`)
  }

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends">Amigos</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
        </TabsList>
        <TabsContent value="friends">
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Buscar por nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-700 text-white placeholder-gray-400"
            />
            {isLoading ? (
              <div className="text-white text-center">Buscando...</div>
            ) : error ? (
              <div className="text-red-500 text-center">{error}</div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={friend.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined}
                          alt={friend.nickname}
                        />
                        <AvatarFallback>
                          {friend.nickname ? friend.nickname.slice(0, 2).toUpperCase() : "UN"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white">{friend.nickname || "Usuario desconocido"}</span>
                    </div>
                    {friend.status === 0 ? (
                      <Button
                        onClick={() => handleSendFriendRequest(friend.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Añadir
                      </Button>
                    ) : friend.status === 1 ? (
                      <Button
                        onClick={() => sendGameInvitation(friend.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Invitar a partida
                      </Button>
                    ) : (
                      <Button disabled className="bg-gray-500 text-white">
                        Solicitud enviada
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="requests">
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
            {friendRequests.length === 0 ? (
              <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {friendRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {request.senderNickname ? request.senderNickname.slice(0, 2).toUpperCase() : "UN"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white">{request.senderNickname || "Usuario desconocido"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Aceptar
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

