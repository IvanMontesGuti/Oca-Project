"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { PlusCircleIcon, UserPlusIcon } from "lucide-react"
//import { FRIENDSHIP_GET_ALL_URL } from "@/lib/endpoints/config";


interface Friend {
  id: string
  name: string
  status: string
  avatar?: string
}

interface FriendRequest {
  id: string
  name: string
  avatar?: string
}

export default function FriendsPanel() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([])

  useEffect(() => {
    fetchFriends()
    fetchFriendRequests()
  }, [])

  useEffect(() => {
    const filtered = friends.filter((friend) => friend.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredFriends(filtered)
  }, [friends, searchQuery])

  const fetchFriends = async () => {
    try {
      const response = await fetch(FRIENDSHIP_GET_ALL_URL)
      const data = await response.json()
      setFriends(data)
    } catch (error) {
      console.error("Error fetching friends:", error)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      
      const response = await fetch(FRIENDSHIP_GET_ALL_URL)
      
      const data = await response.json()
      setFriendRequests(data)
    } catch (error) {
      console.error("Error fetching friend requests:", error)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Amigos</h2>
          <button className="text-sm text-gray-400 hover:text-white">Ver todos</button>
        </div>
        <Input
          type="text"
          placeholder="Search by nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        <div className="space-y-4">
          {filteredFriends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                  <AvatarFallback>{friend.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium leading-none text-white">{friend.name}</div>
                  <div className="text-sm text-gray-400">{friend.status}</div>
                </div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <PlusCircleIcon className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
          <button className="text-sm text-gray-400 hover:text-white">Ver todas</button>
        </div>
        <div className="space-y-4">
          {friendRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={request.avatar || "/placeholder.svg"} alt={request.name} />
                  <AvatarFallback>{request.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="font-medium leading-none text-white">{request.name}</div>
              </div>
              <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                <UserPlusIcon className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

