import type { User } from "./types"
import { Button } from "@/components/ui/button"

interface FriendListProps {
  friends: User[]
  onSendRequest: (userId: string) => void
  onSendInvite: (userId: string) => void
}

export default function FriendList({ friends, onSendRequest, onSendInvite }: FriendListProps) {
  return (
    <ul className="space-y-2">
      {friends.map((friend) => (
        <li key={friend.id} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
          <span>{friend.nickname}</span>
          {friend.status === 1 ? (
            <Button onClick={() => onSendInvite(friend.id)}>Invitar a partida</Button>
          ) : (
            <Button onClick={() => onSendRequest(friend.id)}>Enviar solicitud</Button>
          )}
        </li>
      ))}
    </ul>
  )
}

