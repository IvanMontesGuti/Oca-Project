"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL, API_BASE_URL } from "@/lib/endpoints/config"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
  sender?: {
    id: string
    nickname: string
    avatarUrl: string
  }
  receiver?: {
    id: string
    nickname: string
    avatarUrl: string
  }
}

interface SearchResult {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

export default function FriendsPanel() {
  const { userInfo } = useAuth()
  const { sendFriendRequest: sendFriendRequestProp, respondFriendRequest, friendRequests, socket } = useWebSocket()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
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

      // Filter accepted friends (status 1) and pending requests (status 0)
      const acceptedFriends = data.filter((friend: Friend) => friend.status === 1)
      const pendingRequestsData = data.filter((friend: Friend) => friend.status === 0)

      setFriends(acceptedFriends)
      setPendingRequests(pendingRequestsData)

      console.log("Friends data:", acceptedFriends)
      console.log("Pending requests:", pendingRequestsData)
    } catch (error) {
      console.error("Error fetching friends:", error)
      setError("No se pudieron cargar los amigos.")
      setFriends([])
      setPendingRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [userInfo?.id])

  useEffect(() => {
    fetchFriends()
  }, [fetchFriends])

  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "viewPendingRequests",
        SenderId: userInfo.id.toString(),
      })
      socket.send(message)
    }
  }, [socket, userInfo])

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
    // Remove the request from the list of pending requests
    setPendingRequests((requests) => requests.filter((request) => request.id !== requestId))
    // Add the accepted friend to the friends list
    const acceptedRequest = pendingRequests.find((request) => request.id === requestId)
    if (acceptedRequest) {
      setFriends((prevFriends) => [...prevFriends, { ...acceptedRequest, status: 1 }])
    }
  }

  const handleRejectRequest = (requestId: string, senderId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "respondFriendRequest",
        SenderId: senderId.toString(),
        ReceiverId: userInfo.id.toString(),
        Accepted: false,
      })
      socket.send(message)
      console.log("Rejecting friend request:", message)
    }
    // Remove the request from the list
    setPendingRequests((requests) => requests.filter((request) => request.id !== requestId))
  }

  const handleSendGameInvitation = (friendId: string) => {
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
            setPendingRequests((prev) => [...prev, data])
            break
          case "friendRequestAccepted":
            // Handle accepted friend request
            if (data.SenderId && data.SenderNickname) {
              setFriends((prevFriends) => [
                ...prevFriends,
                {
                  id: data.SenderId,
                  nickname: data.SenderNickname,
                  avatarUrl: data.SenderAvatarUrl || "",
                  status: 1,
                },
              ])
            }
            break
          case "friendRequestRejected":
            // Handle rejected friend request
            // You might want to show a notification to the user
            break
          case "invite":
            // Handle game invitation
            // You might want to show a modal or notification to the user
            break
          case "yourFriendRequestAccepted":
            // Handle when your friend request is accepted by someone else
            if (data.ReceiverId && data.ReceiverNickname) {
              setFriends((prevFriends) => [
                ...prevFriends,
                {
                  id: data.ReceiverId,
                  nickname: data.ReceiverNickname,
                  avatarUrl: data.ReceiverAvatarUrl || "",
                  status: 1,
                },
              ])
            }
            break
          // Add more cases as needed
        }
      }

      socket.addEventListener("message", handleWebSocketMessage)

      return () => {
        socket.removeEventListener("message", handleWebSocketMessage)
      }
    }
  }, [socket, fetchFriends])

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
                {friends.map((friend, index) => {
                  const friendUser = friend.sender?.id === userInfo?.id ? friend.receiver : friend.sender || friend
                  return (
                    <div
                      key={`friend-${friendUser.id}-${friendUser.nickname}-${index}`}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={friendUser.avatarUrl ? `${API_BASE_URL}/${friendUser.avatarUrl}` : undefined}
                            alt={friendUser.nickname}
                          />
                          <AvatarFallback>
                            {friendUser.nickname ? friendUser.nickname.slice(0, 2).toUpperCase() : "NA"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-none text-white">{friendUser.nickname}</div>
                          <div className="text-sm text-gray-400">{friendUser.status === 0 ? "Offline" : "Online"}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="default" onClick={() => handleSendGameInvitation(friendUser.id)}>
                        Invitar a partida
                      </Button>
                    </div>
                  )
                })}
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
      </div>
      <div className="space-y-4 mt-6">
        <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
        {pendingRequests.length === 0 ? (
          <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const senderUser = request.sender
              return (
                <div key={`request-${request.id}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={senderUser.avatarUrl ? `${API_BASE_URL}/${senderUser.avatarUrl}` : undefined}
                        alt={senderUser.nickname}
                      />
                      <AvatarFallback>
                        {senderUser.nickname ? senderUser.nickname.slice(0, 2).toUpperCase() : "NA"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-none text-white">{senderUser.nickname}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id, senderUser.id)}>
                      Aceptar
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleRejectRequest(request.id, senderUser.id)}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

