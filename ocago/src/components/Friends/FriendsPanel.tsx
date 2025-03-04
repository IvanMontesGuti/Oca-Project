"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SEARCH_NONFRIENDS_URL, FRIENDSHIP_DELETE } from "@/lib/endpoints/config"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"
import FriendsList from "./FriendsList"
import FriendRequests from "./FriendRequests"
import SearchResults from "./SearchResult"
import { Users, UserPlus, Search } from "lucide-react"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

export default function FriendsPanel() {
  const { userInfo } = useAuth()
  const { sendMessage, friendRequests, fetchPendingRequests, friends } = useWebSocket()

  const [searchResults, setSearchResults] = useState<Friend[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFriendsModalOpen, setFriendsModalOpen] = useState(false)
  const [isRequestsModalOpen, setRequestsModalOpen] = useState(false)

  useEffect(() => {
    if (isRequestsModalOpen) {
      fetchPendingRequests()
    }
  }, [isRequestsModalOpen, fetchPendingRequests])

  useEffect(() => {
    if (isFriendsModalOpen) {
      sendMessage({
        type: "getFriends",
        senderId: String(userInfo?.id),
      })
    }
  }, [isFriendsModalOpen, sendMessage, userInfo?.id])

  const handleSendFriendRequest = (receiverId: string) => {
    if (!userInfo?.id) return
    sendMessage({
      type: "sendFriendRequest",
      senderId: String(userInfo.id),
      receiverId: String(receiverId),
    })
  }

  const handleRespondFriendRequest = (senderId: string, accepted: boolean) => {
    if (!userInfo?.id) return
    sendMessage({
      type: "respondFriendRequest",
      senderId: String(userInfo.id),
      receiverId: String(senderId),
      accepted: accepted,
    })
  }

  const handleDeleteFriend = async (friendId: string) => {
    if (!userInfo?.id) return
    
    try {
      const response = await fetch(FRIENDSHIP_DELETE(userInfo.id, friendId), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar amigo');
      }
      
      // After successful deletion, refresh the friends list
      sendMessage({
        type: "getFriends",
        senderId: String(userInfo.id),
      });
      
    } catch (error) {
      setError("Error al eliminar amigo. Inténtalo de nuevo.");
      console.error("Error deleting friend:", error);
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
    try {
      const response = await fetch(SEARCH_NONFRIENDS_URL(query, userInfo?.id))
      if (!response.ok) throw new Error("Failed to search users")
      const data = await response.json()
      setSearchResults(data.filter((user: Friend) => user.id !== userInfo?.id))
    } catch  {
      // setError("Error al buscar usuarios.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-4">
        <Button
          onClick={() => setFriendsModalOpen(true)}
          className="flex-1 bg-transparent hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 border-2 border-purple-500 hover:border-purple-400 font-semibold py-4 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-purple-500/30"
        >
          <Users className="mr-2 h-6 w-6" />
          Amigos
        </Button>
        <Button
          onClick={() => setRequestsModalOpen(true)}
          className="flex-1 bg-transparent hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 border-2 border-indigo-500 hover:border-indigo-400 font-semibold py-4 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg hover:shadow-indigo-500/30"
        >
          <UserPlus className="mr-2 h-6 w-6" />
          Solicitudes
          {friendRequests.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {friendRequests.length}
            </span>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar por nickname..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full bg-white/10 text-white placeholder-gray-300 border-0 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-purple-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-300" />
        </div>

        {error && <div className="text-red-400 mt-2">{error}</div>}
        {isLoading && <div className="text-purple-300 mt-2">Cargando...</div>}

        {searchQuery && !isLoading && (
          <div className="bg-white/5 rounded-lg p-4">
            <SearchResults results={searchResults} sendFriendRequest={handleSendFriendRequest} />
          </div>
        )}
      </div>

      <Dialog open={isFriendsModalOpen} onOpenChange={setFriendsModalOpen}>
        <DialogContent className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Amigos</DialogTitle>
          </DialogHeader>
          <FriendsList 
            friends={friends} 
            onDeleteFriend={handleDeleteFriend} 
          />
        </DialogContent>
      </Dialog>
      <Dialog open={isRequestsModalOpen} onOpenChange={setRequestsModalOpen}>
        <DialogContent className="bg-gradient-to-br from-purple-900 to-indigo-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Solicitudes de Amistad</DialogTitle>
          </DialogHeader>
          <FriendRequests requests={friendRequests} respondFriendRequest={handleRespondFriendRequest} />
        </DialogContent>
      </Dialog>
    </div>
  )
}