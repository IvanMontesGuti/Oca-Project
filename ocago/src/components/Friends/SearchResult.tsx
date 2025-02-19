"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/endpoints/config";
import { useAuth } from "@/context/AuthContext";

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

  if (!Array.isArray(results)) {
    console.error("SearchResults expected an array but received:", results);
    return <div className="text-white text-center">Error cargando resultados</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-white">Resultados de búsqueda</h2>
      {results.length === 0 ? (
        <div className="text-white text-center">No se encontraron usuarios</div>
      ) : (
        results.map((user) =>
          user.id !== userInfo?.id && (
            <div key={user?.id || Math.random()} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user?.avatarUrl ? `${API_BASE_URL}/${user.avatarUrl}` : undefined} alt={user?.nickname || 'Usuario'} />
                  <AvatarFallback>{user?.nickname ? user.nickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
                </Avatar>
                <div className="font-medium leading-none text-white">{user?.nickname || "Desconocido"}</div>
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={() => sendFriendRequest(user.id)}>Enviar solicitud</Button>
            </div>
          )
        )
      )}
    </div>
  );
}
