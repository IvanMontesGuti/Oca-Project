"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { API_BASE_URL, FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config"
import { useAuth } from "@/context/AuthContext"
import { useWebSocket } from "@/context/WebSocketContext"

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
}

interface InviteFriendsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteFriendsModal({ isOpen, onClose }: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { userInfo } = useAuth()
  const { socket } = useWebSocket()

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userInfo?.id) return

      setIsLoading(true)
      try {
        const response = await fetch(FRIENDSHIP_GET_BY_ID_URL(userInfo.id))
        if (!response.ok) throw new Error("Failed to fetch friends")
        const data = await response.json()
        setFriends(data.filter((friend: Friend) => friend.status === 1))
      } catch (error) {
        console.error("Error fetching friends:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isOpen) {
      fetchFriends()
    }
  }, [isOpen, userInfo?.id])

  const handleInvite = (friendId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "invite",
        SenderId: userInfo.id.toString(),
        ReceiverId: friendId.toString(),
      })
      socket.send(message)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invitar amigos</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="text-center py-4">Cargando amigos...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-4">No tienes amigos disponibles</div>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={friend.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined}
                        alt={friend.nickname}
                      />
                      <AvatarFallback>{friend.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{friend.nickname}</div>
                  </div>
                  <Button onClick={() => handleInvite(friend.id)} variant="secondary">
                    Invitar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

