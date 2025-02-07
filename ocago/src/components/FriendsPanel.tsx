"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  API_SEARCH_URL,
  FRIENDSHIP_GET_BY_ID_URL,
  API_BASE_URL,
  FRIENDSHIP_RECEIVED_REQUEST_URL,
} from "@/lib/endpoints/config"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

interface FriendRequest {
  id: string
  senderId: string
  nickname: string
  avatarUrl: string
  sentAt: string
}

interface SearchResult {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

export default function FriendsPanel() {
  const { userInfo } = useAuth()
  const { socket } = useWebSocket()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFriends = useCallback(async () => {
    if (!userInfo?.id) {
      console.log("userInfo.id is not available, skipping fetchFriends")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const url = FRIENDSHIP_GET_BY_ID_URL(userInfo.id)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch friends: ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Raw friends data:", data)

      // Filter accepted friends (status 1)
      const acceptedFriends = data.filter((friend: Friend) => friend.status === 1)

      console.log("Filtered friends:", acceptedFriends)

      setFriends(acceptedFriends)

      console.log("Fetched friends:", acceptedFriends)
    } catch (error) {
      console.error("Error fetching friends:", error)
      setError("No se pudieron cargar los amigos.")
      setFriends([])
    } finally {
      setIsLoading(false)
    }
  }, [userInfo?.id])

  const fetchPendingRequests = useCallback(async () => {
    if (!userInfo?.id) {
      console.log("userInfo.id is not available, skipping fetchPendingRequests")
      return
    }

    try {
      const url = FRIENDSHIP_RECEIVED_REQUEST_URL(userInfo.id)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch pending requests: ${response.statusText}`)
      }
      const data = await response.json()
      console.log("Raw pending requests data:", data)

      const pendingRequestsData = data.map((request: any) => ({
        id: request.id,
        senderId: request.sender.id,
        nickname: request.sender.nickname,
        avatarUrl: request.sender.avatarUrl,
        sentAt: request.sentAt,
      }))

      console.log("Processed pending requests:", pendingRequestsData)

      setPendingRequests(pendingRequestsData)
    } catch (error) {
      console.error("Error fetching pending requests:", error)
      setError("No se pudieron cargar las solicitudes pendientes.")
    }
  }, [userInfo?.id])

  useEffect(() => {
    fetchFriends()
    fetchPendingRequests()
  }, [fetchFriends, fetchPendingRequests])

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
      const response = await fetch(API_SEARCH_URL(query))
      if (!response.ok) throw new Error("Failed to search users")
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching users:", error)
      setError("Error al buscar usuarios.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendFriendRequest = (friendId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "sendFriendRequest",
        SenderId: userInfo.id.toString(),
        ReceiverId: friendId.toString(),
      })
      socket.send(message)
      console.log("Sending friend request:", message)
    }
    // Update UI to reflect that the request has been sent
    setSearchResults((results) => results.map((result) => (result.id === friendId ? { ...result, status: 2 } : result)))
  }

  const handleAcceptRequest = (requestId: string, senderId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "respondFriendRequest",
        SenderId: senderId.toString(),
        ReceiverId: userInfo.id.toString(),
        Accepted: true,
      })
      socket.send(message)
      console.log("Accepting friend request:", message)
    }
    // Remove the request from the pending requests list
    setPendingRequests((requests) => requests.filter((req) => req.id !== requestId))
    // The friend will be added to the friends list when we receive the "friendRequestAccepted" message
  }

  const handleRejectRequest = (requestId: string, senderId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "respondFriendRequest",
        SenderId: senderId,
        ReceiverId: userInfo.id.toString(),
        Accepted: false,
      })
      socket.send(message)
      console.log("Rejecting friend request:", message)
    }
    // Remove the request from the pending requests list
    setPendingRequests((requests) => requests.filter((req) => req.id !== requestId))
  }

  const handleGameInvitation = (friendId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "invite",
        SenderId: userInfo.id.toString(),
        ReceiverId: friendId.toString(),
      })
      socket.send(message)
      console.log("Sending game invitation:", message)
    }
  }

  useEffect(() => {
    if (socket) {
      const handleWebSocketMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        console.log("Received WebSocket message:", data)

        switch (data.Type) {
          case "friendRequestReceived":
            // Handle incoming friend request
            const newRequest: FriendRequest = {
              id: data.RequestId,
              senderId: data.SenderId,
              senderNickname: data.SenderNickname,
              senderAvatarUrl: data.SenderAvatarUrl,
              sentAt: new Date().toISOString(), // You might want to use the server's timestamp if provided
            }
            setPendingRequests((prev) => [...prev, newRequest])
            break
          case "friendRequestAccepted":
          case "yourFriendRequestAccepted":
            // Handle accepted friend request
            const newFriend: Friend = {
              id: data.SenderId || data.ReceiverId,
              nickname: data.SenderNickname || data.ReceiverNickname,
              avatarUrl: data.SenderAvatarUrl || data.ReceiverAvatarUrl || "",
              status: 1,
            }
            setFriends((prevFriends) => {
              if (!prevFriends.some((friend) => friend.id === newFriend.id)) {
                return [...prevFriends, newFriend]
              }
              return prevFriends
            })
            // Remove from pending requests if it was there
            setPendingRequests((prev) => prev.filter((req) => req.senderId !== newFriend.id))
            break
          case "friendRequestRejected":
            // Remove from pending requests
            setPendingRequests((prev) => prev.filter((req) => req.senderId !== data.SenderId))
            break
          case "invite":
            // Handle game invitation
            // You might want to show a modal or notification to the user
            break
        }
      }

      socket.addEventListener("message", handleWebSocketMessage)

      return () => {
        socket.removeEventListener("message", handleWebSocketMessage)
      }
    }
  }, [socket])

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
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
        ) : searchQuery.trim() === "" ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-white">Amigos</h2>
            {friends.length === 0 ? (
              <div className="text-white text-center">No tienes amigos aún</div>
            ) : (
              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={friend.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined}
                          alt={friend.nickname}
                        />
                        <AvatarFallback>{friend.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium leading-none text-white">{friend.nickname}</div>
                    </div>
                    <Button size="sm" variant="default" onClick={() => handleGameInvitation(friend.id)}>
                      Invitar a partida
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
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
                      onClick={() => handleGameInvitation(user.id)}
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
      </div>
      <div className="space-y-4 mt-6">
        <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
        {pendingRequests.length === 0 ? (
          <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={`request-${request.id}`} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={request.avatarUrl ? `${API_BASE_URL}/${request.avatarUrl}` : undefined}
                      alt={request.nickname}
                    />
                    <AvatarFallback>
                      {request.nickname ? request.nickname.slice(0, 2).toUpperCase() : "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-none text-white">{request.nickname}</div>
                    <div className="text-sm text-gray-400">{new Date(request.sentAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id, request.senderId)}>
                    Aceptar
                  </Button>
                  <Button size="sm" variant="default" onClick={() => handleRejectRequest(request.id, request.senderId)}>
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


