"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/endpoints/config";

interface Friend {
  id: string;
  nickname: string;
  avatarUrl?: string;
  status: number;
}

interface FriendsListProps {
  friends: Friend[];
}

export default function FriendsList({ friends = [] }: FriendsListProps) {
  if (!Array.isArray(friends)) {
    console.error("FriendsList expected an array but received:", friends);
    return <div className="text-white text-center">Error cargando amigos</div>;
  }
  
  return (
    <div className="space-y-4">
      {friends.length === 0 ? (
        <div className="text-white text-center">No tienes amigos aún</div>
      ) : (
        friends.map((friend) => (
          <div key={friend?.id || Math.random()} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={friend?.avatarUrl ? `${API_BASE_URL}/${friend.avatarUrl}` : undefined} alt={friend?.nickname || 'Usuario'} />
                <AvatarFallback>{friend?.nickname ? friend.nickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium leading-none text-white">{friend?.nickname || "Desconocido"}</div>
                <div className="text-sm text-gray-400">{friend?.status === 0 ? "Offline" : "Online"}</div>
              </div>
            </div>
            <Button size="sm" variant="default">Invitar a partida</Button>
          </div>
        ))
      )}
    </div>
  );
}
