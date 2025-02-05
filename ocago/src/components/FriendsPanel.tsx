"use client"

import { useState, useEffect, useCallback } from "react"
import { jwtDecode } from "jwt-decode"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL, API_BASE_URL } from "@/lib/endpoints/config"
import { useWebSocket } from "@/context/WebSocketContext"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status?: string | number
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
  isFriend?: boolean
}

interface DecodedToken {
  id: number
  nickname: string
  avatarUrl?: string
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

interface FriendRequest {
  id: string
  sender: {
    id: string
    nickname: string
    avatarUrl: string
  }
  status: number
  senderAvatarUrl?: string
  senderNickname?: string
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center mt-6 gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page - 1)}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${page - 1 === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente →
      </button>
    </div>
  )
}

export default function FriendsPanel() {
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { sendFriendRequest, respondFriendRequest, friendRequests } = useWebSocket()

  const currentUser = {
    id: userInfo?.id,
    unique_name: userInfo?.nickname,
    status: 0,
    avatarUrl: userInfo?.avatarUrl,
  }

  const fetchFriends = useCallback(
    async (page = 0, search = "") => {
      if (!userInfo?.id) {
        console.log("userInfo.id is not available, skipping fetchFriends")
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let url
        let data
        if (search.trim() === "") {
          url = FRIENDSHIP_GET_BY_ID_URL(userInfo.id)
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to fetch friends: ${response.statusText}`)
          }
          data = await response.json()
          // Mark these as friends
          setFriends(data.map((friend: Friend) => ({ ...friend, isFriend: true })) || [])
        } else {
          url = API_SEARCH_URL(search)
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to search users: ${response.statusText}`)
          }
          data = await response.json()
          // Check if each user is a friend
          const friendsResponse = await fetch(FRIENDSHIP_GET_BY_ID_URL(userInfo.id))
          if (!friendsResponse.ok) {
            // If there's an error fetching friends, assume the user has no friends
            setFriends(data.map((user: Friend) => ({ ...user, isFriend: false })) || [])
          } else {
            const friendsData = await friendsResponse.json()
            const friendIds = new Set(friendsData.map((friend: Friend) => friend.id))
            setFriends(data.map((user: Friend) => ({ ...user, isFriend: friendIds.has(user.id) })) || [])
          }
        }

        console.log("Friends/Search data:", data)
        setTotalPages(1)
      } catch (error) {
        console.error("Error fetching friends:", error)
        setError("No se encontraron usuarios con este nickname.")
        setFriends([])
      } finally {
        setIsLoading(false)
      }
    },
    [userInfo?.id],
  )

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken")
      if (token) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(token)
          setUserInfo(decodedToken)
        } catch (error) {
          console.error("Error al decodificar el token:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (userInfo?.id) {
      fetchFriends(currentPage, searchQuery)
    }
  }, [userInfo, currentPage, searchQuery, fetchFriends])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(0)
  }

  const handlePageClick = (selected: number) => {
    setCurrentPage(selected)
  }

  const handleSendFriendRequest = (friendId: string) => {
    sendFriendRequest(friendId)
    // Update UI to reflect that the request has been sent
    setFriends(friends.map((friend) => (friend.id === friendId ? { ...friend, status: 2 } : friend)))
  }

  const handleAcceptRequest = (requestId: string) => {
    respondFriendRequest(requestId, true)
    // Refresh friends list after accepting
    fetchFriends(currentPage, searchQuery)
  }

  const handleRejectRequest = (requestId: string) => {
    respondFriendRequest(requestId, false)
  }

  console.log("friends", friends)
  console.log(`${API_BASE_URL}/${currentUser.avatarUrl}`)

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Amigos</h2>
        </div>
        <Input
          type="text"
          placeholder="Buscar por nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        {isLoading ? (
          <div className="text-white text-center">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : friends.length === 0 ? (
          <div className="text-white text-center">No friends found</div>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => {
              const friendUser = friend.sender?.id === userInfo?.id ? friend.receiver : friend.sender || friend
              return (
                <div key={friendUser.id} className="flex items-center justify-between group">
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
                      {friend.isFriend && (
                        <div className="text-sm text-gray-400">{friendUser.status === "0" ? "Offline" : "Online"}</div>
                      )}
                    </div>
                  </div>
                  {!friend.isFriend && friendUser.id !== String(userInfo?.id) && (
                    <Button size="sm" variant="default" onClick={() => handleSendFriendRequest(friendUser.id)}>
                      Enviar solicitud
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {!isLoading && !error && friends.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageClick} />
        )}
      </div>
      <div className="space-y-4 mt-6">
        <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
        {friendRequests.length === 0 ? (
          <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
        ) : (
          <div className="space-y-4">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage
                      src={request.senderAvatarUrl ? `${API_BASE_URL}/${request.senderAvatarUrl}` : undefined}
                      alt={request.senderNickname}
                    />
                    <AvatarFallback>
                      {request.senderNickname ? request.senderNickname.slice(0, 2).toUpperCase() : "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-none text-white">{request.senderNickname}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id)}>
                    Aceptar
                  </Button>
                  <Button size="sm" variant="default" onClick={() => handleRejectRequest(request.id)}>
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

