"use client"
import { useState, useEffect, useCallback } from "react"
import { jwtDecode } from "jwt-decode"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  API_SEARCH_URL,
  FRIENDSHIP_GET_BY_ID_URL,
  FRIENDSHIP_RECEIVED_REQUEST_URL,
  FRIENDSHIP_ACCEPT_REQUEST_URL,
  FRIENDSHIP_DELETE_REQUEST_URL,
  API_BASE_URL,
  FRIENDSHIP_SEND_REQUEST_URL,
} from "@/lib/endpoints/config"

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
}


export default function FriendsPanel() {
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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



  const fetchFriendRequests = useCallback(async () => {
    if (!userInfo?.id) {
      console.log("userInfo.id is not available, skipping fetchFriendRequests")
      return
    }

    console.log("Fetching friend requests for user ID:", userInfo.id)
    try {
      const response = await fetch(FRIENDSHIP_RECEIVED_REQUEST_URL(userInfo.id))
      console.log("Friend requests response:", response)
      if (!response.ok) {
        throw new Error("Failed to fetch friend requests")
      }
      const data = await response.json()
      console.log("Friend requests data:", data)
      setFriendRequests(data.filter((request: FriendRequest) => request.status === 0))
    } catch (error) {
      console.error("Error fetching friend requests:", error)
    }
  }, [userInfo?.id])

  const handleSendFriendRequest = async (receiverId: string) => {
    if (!userInfo?.id) return

    try {
      const url = `${FRIENDSHIP_SEND_REQUEST_URL}?senderId=${userInfo.id}&receiverId=${receiverId}`
      const response = await fetch(url, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to send friend request")
      }
      fetchFriends(currentPage, searchQuery)
    } catch (error) {
      console.error("Error sending friend request:", error)
    }
  }

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
      fetchFriendRequests()
    }
  }, [userInfo, currentPage, searchQuery, fetchFriends, fetchFriendRequests])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(0)
  }

  const handlePageClick = (selected: number) => {
    setCurrentPage(selected)
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    if (!userInfo?.id) return

    try {
      const url = `${FRIENDSHIP_ACCEPT_REQUEST_URL(friendshipId)}?userId=${userInfo.id}`
      const response = await fetch(url, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to accept friend request")
      }

      fetchFriendRequests()
      fetchFriends(currentPage, searchQuery)
    } catch (error) {
      console.error("Error accepting friend request:", error)
    }
  }

  const handleRejectRequest = async (friendshipId: string) => {
    if (!userInfo?.id) return

    try {
      const url = `${FRIENDSHIP_DELETE_REQUEST_URL(friendshipId)}?userId=${userInfo.id}`
      const response = await fetch(url, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to reject friend request")
      }
      console.log(response, "response")

      // Refresh friend requests
      fetchFriendRequests()
    } catch (error) {
      console.error("Error rejecting friend request:", error)
    }
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
                        src={`${API_BASE_URL}/${friendUser.avatarUrl}` || "/placeholder.svg"}
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
                  {!friend.isFriend && friendUser.id !== userInfo?.id && (
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
                      src={`${API_BASE_URL}/${request.sender.avatarUrl}` || "/placeholder.svg"}
                      alt={request.sender.nickname}
                    />
                    <AvatarFallback>
                      {request.sender.nickname ? request.sender.nickname.slice(0, 2).toUpperCase() : "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-none text-white">{request.sender.nickname}</div>
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
