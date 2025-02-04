"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_SEARCH_URL, API_BASE_URL, FRIENDSHIP_RECEIVED_REQUEST_URL, FRIENDSHIP_ACCEPT_REQUEST_URL, FRIENDSHIP_REJECT_REQUEST_URL } from "@/lib/endpoints/config";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";

interface Friend {
  id: string;
  nickname: string;
  avatarUrl: string;
  isFriend?: boolean;
}

interface FriendRequest {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatarUrl: string;
}

export default function FriendsPanel() {
  const { userInfo } = useAuth();
  const { sendFriendRequest } = useWebSocket();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar amigos por nickname
  const fetchFriends = useCallback(async () => {
    if (!userInfo?.id || searchQuery.trim() === "") return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_SEARCH_URL(searchQuery));
      if (!response.ok) throw new Error("Error al buscar usuarios");

      const data = await response.json();
      setFriends(data);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setError("No se encontraron usuarios con este nickname.");
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id, searchQuery]);

  // Obtener solicitudes de amistad
  const fetchFriendRequests = useCallback(async () => {
    if (!userInfo?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(FRIENDSHIP_RECEIVED_REQUEST_URL(userInfo.id));
      if (!response.ok) throw new Error("Error al obtener solicitudes de amistad");

      const data = await response.json();
      setFriendRequests(data.map((request: any) => ({
        id: request.id,
        senderId: request.senderId,
        senderNickname: request.sender.nickname,
        senderAvatarUrl: request.sender.avatarUrl,
      })));
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      setError("No se pudieron obtener las solicitudes.");
      setFriendRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchFriends();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, fetchFriends]);

  useEffect(() => {
    fetchFriendRequests();
  }, [userInfo?.id, fetchFriendRequests]);

  // Aceptar solicitud de amistad
  const handleAcceptRequest = async (friendshipId: string, receiverId: string) => {
    if (!userInfo?.id) return;
  
    try {
      // La URL ahora pasa tanto el userId como el receiverId
      const url = `${FRIENDSHIP_ACCEPT_REQUEST_URL(friendshipId)}?friendshipId=${userInfo.id}&userId=${receiverId}`;
      const response = await fetch(url, {
        method: "POST",
      });
  
      if (!response.ok) {
        throw new Error("Failed to accept friend request");
      }
      fetchFriendRequests();
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };
  
  // Rechazar solicitud de amistad
  const handleRejectRequest = async (friendshipId: string) => {
    if (!userInfo?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `${FRIENDSHIP_REJECT_REQUEST_URL(friendshipId)}?userId=${userInfo.id}`;
      const response = await fetch(url, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to reject friend request");

      console.log(response, "response");

      fetchFriendRequests();  // Refrescar solicitudes de amistad
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      setError("No se pudo rechazar la solicitud.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
        <h2 className="font-semibold text-white">Amigos</h2>
        <Input
          type="text"
          placeholder="Buscar por nickname..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        {isLoading ? (
          <div className="text-white text-center">Buscando...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <div className="space-y-4 max-h-[150px] overflow-y-auto">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`${API_BASE_URL}/${friend.avatarUrl}`} alt={friend.nickname} />
                    <AvatarFallback>{friend.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-white">{friend.nickname}</span>
                </div>
                {!friend.isFriend && (
                  <Button onClick={() => sendFriendRequest(friend.id)} className="bg-blue-500 hover:bg-blue-600 text-white">
                    Añadir
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4 mt-6">
        <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
        {isLoading ? (
          <div className="text-white text-center">Cargando solicitudes...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : friendRequests.length === 0 ? (
          <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
        ) : (
          <div className="space-y-4">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={`${API_BASE_URL}/${request.senderAvatarUrl}`} alt={request.senderNickname} />
                    <AvatarFallback>{request.senderNickname ? request.senderNickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
                  </Avatar>
                  <span className="text-white">{request.senderNickname}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleAcceptRequest(request.id, request.senderId)}>
                    Aceptar
                  </Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={() => handleRejectRequest(request.id)}>
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
