"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/endpoints/config";

interface FriendRequest {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

interface FriendRequestsProps {
  requests: FriendRequest[];
  respondFriendRequest: (id: string, accepted: boolean) => void;
}

export default function FriendRequests({ requests = [], respondFriendRequest }: FriendRequestsProps) {
  if (!Array.isArray(requests)) {
    console.error("FriendRequests expected an array but received:", requests);
    return <div className="text-white text-center">Error cargando solicitudes de amistad</div>;
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-white text-center">No hay solicitudes pendientes</div>
      ) : (
        requests.map((request) => (
          <div key={request?.id || Math.random()} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={request?.avatarUrl ? `${API_BASE_URL}/${request.avatarUrl}` : undefined} alt={request?.nickname || 'Usuario'} />
                <AvatarFallback>{request?.nickname ? request.nickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium leading-none text-black">{request?.nickname || "Desconocido"}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={() => respondFriendRequest(request.id, true)}>Aceptar</Button>
              <Button size="sm" variant="destructive" onClick={() => respondFriendRequest(request.id, false)}>Rechazar</Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
