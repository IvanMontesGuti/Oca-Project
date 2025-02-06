import type { FriendRequest } from "./types"
import { Button } from "@/components/ui/button"

interface FriendRequestsProps {
  requests: FriendRequest[]
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
}

export default function FriendRequests({ requests, onAccept, onReject }: FriendRequestsProps) {
  return (
    <ul className="space-y-2">
      {requests.map((request) => (
        <li key={request.id} className="flex items-center justify-between p-2 bg-secondary rounded-lg">
          <span>{request.from.nickname}</span>
          <div className="space-x-2">
            <Button onClick={() => onAccept(request.id)} variant="default">
              Aceptar
            </Button>
            <Button onClick={() => onReject(request.id)} variant="destructive">
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

