"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL, API_BASE_URL } from "@/lib/endpoints/config";
import { useAuth } from "@/context/AuthContext";
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

interface SearchResult {
  id: string;
  nickname: string;
  avatarUrl: string;
  status: number;
}

export default function FriendsPanel() {
  const { userInfo } = useAuth();
  // Desestructuramos las funciones y estados que nos provee el WebSocketContext
  const {
    sendFriendRequest,
    respondFriendRequest,
    createLobby,
    inviteToLobby,
    respondLobbyInvitation,
    friendRequests, // solicitudes de amistad que llegan por WS
    lobbies,       // lobbies creadas que pueden servir para invitar
    socket,
  } = useWebSocket();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esta función se encarga de traer la lista de amigos y solicitudes (vía API)
  const fetchFriends = useCallback(async () => {
    if (!userInfo?.id) {
      console.log("userInfo.id is not available, skipping fetchFriends");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = FRIENDSHIP_GET_BY_ID_URL(userInfo.id);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch friends: ${response.statusText}`);
      }
      const data = await response.json();

      // Separamos amigos aceptados (status 1) y solicitudes pendientes (status 0)
      const acceptedFriends = data.filter((friend: Friend) => friend.status === 1);
      const pendingRequestsData = data.filter((friend: Friend) => friend.status === 0);

      setFriends(acceptedFriends);
      setPendingRequests(pendingRequestsData);

      console.log("Friends data:", acceptedFriends);
      console.log("Pending requests:", pendingRequestsData);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setError("No se pudieron cargar los amigos.");
      setFriends([]);
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [userInfo?.id]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Se envía la petición para ver solicitudes pendientes vía WS
  useEffect(() => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "viewPendingRequests",
        SenderId: userInfo.id.toString(),
      });
      socket.send(message);
    }
  }, [socket, userInfo]);

  // Función para buscar usuarios
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_SEARCH_URL(query));
      if (!response.ok) throw new Error("Failed to search users");
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching users:", error);
      setError("Error al buscar usuarios.");
    } finally {
      setIsLoading(false);
    }
  };

  // Se llama al método del contexto para enviar solicitud de amistad
  const handleSendFriendRequest = (friendId: string) => {
    sendFriendRequest(friendId);
    // Actualizamos UI para reflejar que ya se envió la solicitud (status 2)
    setSearchResults((results) =>
      results.map((result) => (result.id === friendId ? { ...result, status: 2 } : result))
    );
  };

  // Para responder a una solicitud de amistad (aceptar)
  const handleAcceptRequest = (requestId: string, senderId: string) => {
    respondFriendRequest(senderId, true);
    // Actualizamos la UI: removemos de pendientes y agregamos a la lista de amigos
    setPendingRequests((prev) => prev.filter((request) => request.id !== requestId));
    const acceptedRequest = pendingRequests.find((request) => request.id === requestId);
    if (acceptedRequest) {
      setFriends((prev) => [...prev, { ...acceptedRequest, status: 1 }]);
    }
  };

  // Para responder a una solicitud de amistad (rechazar)
  const handleRejectRequest = (requestId: string, senderId: string) => {
    respondFriendRequest(senderId, false);
    setPendingRequests((prev) => prev.filter((request) => request.id !== requestId));
  };

  // Para invitar a partida. Aquí usamos la función del contexto: inviteToLobby.
  // Se asume que ya se creó una lobby; si no existe, se puede crear.
  const handleSendGameInvitation = (friendId: string) => {
    // Tomamos el último lobby creado (si existe)
    const currentLobbyId = lobbies[lobbies.length - 1]?.id;
    if (!currentLobbyId) {
      // Si no hay lobby, se crea una nueva.
      createLobby();
      // Opcional: mostrar toast o esperar a que se cree la lobby para luego invitar
      return;
    }
    inviteToLobby(currentLobbyId, friendId);
  };

  // Para responder a una invitación de lobby (aceptar o rechazar)
  const handleLobbyResponse = (lobbyId: string, accepted: boolean) => {
    respondLobbyInvitation(lobbyId, accepted);
  };

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4 max-h-[250px] overflow-y-auto">
        <Input
          type="text"
          placeholder="Buscar por nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        {isLoading ? (
          <div className="text-white text-center">Cargando...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : searchQuery.trim() === "" ? (
          <div className="space-y-4">
            <h2 className="font-semibold text-white ">Amigos</h2>
            {friends.length === 0 ? (
              <div className="text-white text-center">No tienes amigos aún</div>
            ) : (
              <div className="space-y-4">
                {friends.map((friend, index) => {
                  // Determinamos el usuario a mostrar (según la estructura de la API)
                  const friendUser = friend.sender?.id === userInfo?.id ? friend.receiver : friend.sender || friend;
                  return (
                    <div
                      key={`friend-${friendUser.id}-${friendUser.nickname}-${index}`}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={friendUser.avatarUrl ? `${API_BASE_URL}/${friendUser.avatarUrl}` : undefined}
                            alt={friendUser.nickname}
                          />
                          <AvatarFallback>
                            {friendUser.nickname ? friendUser.nickname.slice(0, 2).toUpperCase() : "NA"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-none text-white">{friendUser.nickname}</div>
                          <div className="text-sm text-gray-400">
                            {friendUser.status === 0 ? "Offline" : "Online"}
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="default" onClick={() => handleSendGameInvitation(friendUser.id)}>
                        Invitar a partida
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 max-h-[250px] overflow-y-auto">
            <h2 className="font-semibold text-white">Resultados de búsqueda</h2>
            {searchResults.length === 0 ? (
              <div className="text-white text-center">No se encontraron usuarios</div>
            ) : (
              searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={user.avatarUrl ? `${API_BASE_URL}/${user.avatarUrl}` : undefined}
                        alt={user.nickname}
                      />
                      <AvatarFallback>{user.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium leading-none text-white">{user.nickname}</div>
                  </div>
                  {user.status === 1 ? (
                    <Button
                      onClick={() => handleSendGameInvitation(user.id)}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Invitar a partida
                    </Button>
                  ) : user.status === 0 ? (
                    <Button
                      onClick={() => handleSendFriendRequest(user.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Enviar solicitud
                    </Button>
                  ) : (
                    <Button disabled className="bg-gray-500 text-white">
                      Solicitud enviada
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <div className="space-y-4 mt-6">
        <h2 className="font-semibold text-white">Solicitudes de amistad</h2>
        {pendingRequests.length === 0 ? (
          <div className="text-white text-center">No hay solicitudes de amistad pendientes</div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => {
              const senderUser = request.sender;
              return (
                <div key={`request-${request.id}`} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={senderUser.avatarUrl ? `${API_BASE_URL}/${senderUser.avatarUrl}` : undefined}
                        alt={senderUser.nickname}
                      />
                      <AvatarFallback>
                        {senderUser.nickname ? senderUser.nickname.slice(0, 2).toUpperCase() : "NA"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-none text-white">{senderUser.nickname}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => handleAcceptRequest(request.id, senderUser.id)}>
                      Aceptar
                    </Button>
                    <Button size="sm" variant="default" onClick={() => handleRejectRequest(request.id, senderUser.id)}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
