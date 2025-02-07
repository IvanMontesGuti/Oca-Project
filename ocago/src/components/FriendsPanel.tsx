"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"
import { API_SEARCH_URL, API_BASE_URL, FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

interface SearchResult {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

export default function FriendsPanel() {
  const { userInfo } = useAuth()
  const { sendFriendRequest, respondFriendRequest, createLobby, inviteToLobby, friendRequests } = useWebSocket()

  const [friends, setFriends] = useState<Friend[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userInfo?.id) {
      fetchFriends()
    }
  }, [userInfo])

  const fetchFriends = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await FRIENDSHIP_GET_BY_ID_URL(userInfo!.id)
      setFriends(data.filter((friend: Friend) => friend.status === 1))
    } catch (error) {
      console.error("Error fetching friends:", error)
      setError("No se pudieron cargar los amigos.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)

    if (query.trim() === "") {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await API_SEARCH_URL(query){}
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching users:", error)
      setError("Error al buscar usuarios.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendFriendRequest = (friendId: string) => {
    sendFriendRequest(friendId)
    setSearchResults((results) => results.map((result) => (result.id === friendId ? { ...result, status: 2 } : result)))
  }

  const handleAcceptRequest = (senderId: string) => {
    respondFriendRequest(senderId, true)
  }

  const handleRejectRequest = (senderId: string) => {
    respondFriendRequest(senderId, false)
  }

  const handleSendGameInvitation = (friendId: string) => {
    createLobby()
    // Assuming createLobby is asynchronous and returns a lobbyId
    // You might need to adjust this based on your actual implementation
    createLobby().then((lobbyId) => {
      if (lobbyId) {
        inviteToLobby(lobbyId, friendId)
      }
    })
  }

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <Input
        type="text"
        placeholder="Buscar por nickname..."
        value={searchQuery}
        onChange={handleSearch}
        className="w-full bg-gray-700 text-white placeholder-gray-400"
      />

      {isLoading ? (
        <div className="text-white text-center">Cargando...</div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Amigos</h2>
            {friends.length === 0 ? (
              <div className="text-white text-center">No tienes amigos aún</div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={friend.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined}
                        alt={friend.nickname}
                      />
                      <AvatarFallback>{friend.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-none text-white">{friend.nickname}</div>
                      <div className="text-sm text-gray-400">{friend.status === 0 ? "Offline" : "Online"}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="default" onClick={() => handleSendGameInvitation(friend.id)}>
                    Invitar a partida
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
            {friendRequests.length === 0 ? (
              <div className="text-white text-center">No hay solicitudes pendientes</div>
            ) : (
              friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{request.senderId.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium leading-none text-white">Usuario {request.senderId}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.senderId)}>
                      Aceptar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(request.senderId)}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {searchQuery && (
            <div className="space-y-4">
              <h2 className="font-semibold text-white">Resultados de búsqueda</h2>
              {searchResults.length === 0 ? (
                <div className="text-white text-center">No se encontraron usuarios</div>
              ) : (
                searchResults.map((user) => (
                  <div key={user.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={user.avatarUrl ? `${API_BASE_URL}/${user.avatarUrl}` : undefined}
                          alt={user.nickname}
                        />
                        <AvatarFallback>{user.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium leading-none text-white">{user.nickname}</div>
                    </div>
                    {user.status === 1 ? (
                      <Button
                        onClick={() => handleSendGameInvitation(user.id)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Invitar a partida
                      </Button>
                    ) : user.status === 0 ? (
                      <Button
                        onClick={() => handleSendFriendRequest(user.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Enviar solicitud
                      </Button>
                    ) : (
                      <Button disabled className="bg-gray-500 text-white">
                        Solicitud enviada
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

