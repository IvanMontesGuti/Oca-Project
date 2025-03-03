"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/endpoints/config";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { useRouter } from "next/navigation";  // Importar useRouter

interface SearchResult {
  id: string;
  nickname: string;
  avatarUrl?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  sendFriendRequest: (id: string) => void;
}

export default function SearchResults({ results = [], sendFriendRequest }: SearchResultsProps) {
  const { userInfo } = useAuth();
  const { friends, friendRequests } = useWebSocket();
  const router = useRouter();  // Inicializar useRouter

  if (!Array.isArray(results)) {
    console.error("SearchResults expected an array but received:", results);
    return <div className="text-white text-center">Error cargando resultados</div>;
  }

  const filteredResults = results.filter(user => 
    user.id !== userInfo?.id && !friends.some(friend => friend.id === user.id)
  );

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-white">Resultados de búsqueda</h2>
      {filteredResults.length === 0 ? (
        <div className="text-white text-center">No se encontraron usuarios</div>
      ) : (
        filteredResults.map((user) => {
          const hasPendingRequest = friendRequests.some(request => request.id === user.id);

          return (
            <div
              key={user?.id || Math.random()}
              className="flex items-center justify-between group cursor-pointer"
              onClick={() => router.push(`/profile/${user.nickname}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={user?.avatarUrl ? `${API_BASE_URL}/${user.avatarUrl}` : undefined}
                    alt={user?.nickname || 'Usuario'}
                  />
                  <AvatarFallback>{user?.nickname ? user.nickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
                </Avatar>
                <div className="font-medium leading-none text-white">{user?.nickname || "Desconocido"}</div>
              </div>
              {hasPendingRequest ? (
                <Button className="bg-gray-500 text-white" disabled>Solicitud enviada</Button>
              ) : (
                <Button
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendFriendRequest(user.id);
                  }}
                >
                  Enviar solicitud
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
