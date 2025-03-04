"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { API_BASE_URL } from "@/lib/endpoints/config"
import { useWebSocket } from "@/context/WebSocketContext"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

interface FriendsListProps {
  friends: Friend[]
  onDeleteFriend?: (friendId: string) => void
}

export default function FriendsList({ friends = [], onDeleteFriend }: FriendsListProps) {
  const { sendInvitation } = useWebSocket()
  const router = useRouter()

  if (!Array.isArray(friends)) {
    console.error("FriendsList expected an array but received:", friends)
    return <div className="text-white text-center">Error cargando amigos</div>
  }
  
  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return { text: "Desconectado", color: "text-gray-400" }
      case 1:
        return { text: "Conectado", color: "text-green-400" }
      case 2:
        return { text: "Buscando partida", color: "text-yellow-400" }
      case 3:
        return { text: "Jugando", color: "text-purple-400" }
      default:
        return { text: "Desconocido", color: "text-gray-400" }
    }
  }
  
  const handleInviteToGame = (friendId: string) => {
    sendInvitation(friendId)
  }
  
  return (
    <div className="space-y-4">
      {friends.length === 0 ? (
        <div className="text-white text-center">No tienes amigos aún</div>
      ) : (
        friends.map((friend) => {
          const status = getStatusText(friend.status)
          const canInvite = friend.status === 1

          return (
            <div key={friend?.id || Math.random()} className="flex items-center justify-between group">
              <div className="flex items-center gap-3" onClick={() => router.push(`/profile/${friend.nickname}`)}>
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={friend?.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined} alt={friend?.nickname || 'Usuario'} />
                    <AvatarFallback>{friend?.nickname ? friend.nickname.slice(0, 1).toUpperCase() : "NA"}</AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${friend.status === 0 ? "bg-gray-500" : "bg-green-500"} ring-2 ring-white`}
                  ></span>
                </div>
                <div>
                  <div className="font-medium leading-none text-white">{friend?.nickname || "Desconocido"}</div>
                  <div className={`text-sm ${status.color}`}>{status.text}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {onDeleteFriend && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFriend(friend.id);
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title="Eliminar amigo"
                  >
                    <UserMinus className="h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="default"
                  disabled={!canInvite || friend.status > 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInviteToGame(friend.id);
                  }}
                  className={!canInvite || friend.status > 1 ? "opacity-50 cursor-not-allowed" : ""}
                >
                  {friend.status === 2 ? "Buscando partida..." : friend.status === 3 ? "En partida" : "Invitar a partida"}
                </Button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}