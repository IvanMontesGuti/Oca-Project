"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config"; // Updated import for the URL function
import { Dialog, DialogContent, DialogTitle } from "@radix-ui/react-dialog";
import { DialogHeader } from "./ui/dialog";
import { useAuth } from "@/context/AuthContext"; // Assuming userInfo comes from the AuthContext

interface Friend {
  id: string
  nickname: string
  avatarUrl: string
  status: number
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
}

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteFriendsModal = ({ isOpen, onClose }: InviteFriendsModalProps) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userInfo } = useAuth(); // Assuming userInfo is available from context

  useEffect(() => {
    const fetchFriends = async () => {
      if (!userInfo?.id) return; // Ensure userInfo is available

      try {
        const response = await fetch(FRIENDSHIP_GET_BY_ID_URL(userInfo.id)); // Using the dynamic URL
        if (!response.ok) throw new Error("Error fetching friends");

        const data: Friend[] = await response.json();
        console.log("👫 Friends:", data);
        
        setFriends(data);
      } catch (err) {
        setError("Failed to load friends");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [userInfo]); // Trigger the fetch when userInfo changes

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
            {friends.map((friend) => (
              
              <div key={`${friend.id}-${friend.nickname}`} className="flex items-center space-x-4 p-2 bg-gray-100 rounded-lg">
                <Avatar>
                  <AvatarImage src={friend.sender?.avatarUrl || "/default-avatar.png"} alt={friend.nickname} />
                  <AvatarFallback>{friend.nickname?.slice(0, 2).toUpperCase() || "NA"}</AvatarFallback>
                </Avatar>
                <span>{friend.nickname}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
