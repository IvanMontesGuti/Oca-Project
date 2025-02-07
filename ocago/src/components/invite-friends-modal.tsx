"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_BASE_URL, FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config";
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { DialogHeader } from "./ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { useWebSocket } from "@/context/WebSocketContext";

interface Friend {
  id: string;
  nickname: string;
  avatarUrl: string;
  status: number;
  sender?: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
  receiver?: {
    id: string;
    nickname: string;
    avatarUrl: string;
  };
}

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteFriendsModal = ({ isOpen, onClose }: InviteFriendsModalProps) => {
  const { socket } = useWebSocket()
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userInfo } = useAuth();

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userInfo?.id) return;

      try {
        const response = await fetch(FRIENDSHIP_GET_BY_ID_URL(userInfo.id));
        if (!response.ok) throw new Error("Error fetching friends");

        const data: Friend[] = await response.json();
        

        setFriends(data);
      } catch (err) {
        setError("Failed to load friends");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [userInfo]);

  const handleSendGameInvitation = (friendId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "invite",
        SenderId: userInfo.id.toString(),
        ReceiverId: friendId.toString(),
      })
      socket.send(message)
      console.log("Sending game invitation:", message)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Amigos</DialogTitle>
        </DialogHeader>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && friends.length === 0 && <p>No friends found.</p>}
        {!loading && !error && friends.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {friends.map((friend) => {
              const friendUser = friend.sender?.id === userInfo?.id ? friend.receiver : friend.sender || friend;
              return (
                <div key={`${friendUser?.id}-${friendUser?.nickname}`} className="flex items-center space-x-4 p-2 bg-gray-100 rounded-lg">
                  <Avatar>
                    <AvatarImage src={friendUser.avatarUrl ? `${API_BASE_URL}/${friendUser.avatarUrl}` : undefined} />
                    <AvatarFallback>{friendUser?.nickname?.slice(0, 2).toUpperCase() || "NA"}</AvatarFallback>
                  </Avatar>
                  <span>{friendUser?.nickname}</span>
                  <Button size="sm" variant="default" onClick={() => handleSendGameInvitation(friendUser.id)}>
                        Invitar a partida
                      </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};