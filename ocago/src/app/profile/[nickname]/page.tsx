"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL, GET_USER_BY_NICKNAME_URL, FRIENDSHIP_GET_BY_ID_URL, GET_USER_HISTORY } from "@/lib/endpoints/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Header2 } from "@/components/Home/navUser";
import ProtectedRoute from "@/components/ProtectedRoute/page";

interface User {
  id: string;
  nickname?: string;
  mail?: string;
  avatarUrl?: string | null;
}

interface Friend {
  id: string;
  nickname?: string;
  avatarUrl?: string | null;
}

interface Game {
  id: string;
  playerId1?: string;
  playerId2?: string;
  winner: string;
}

export default function UserProfile() {
  const { nickname } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (nickname) {
      const nicknameStr = Array.isArray(nickname) ? nickname[0] : nickname;
      fetchUserProfile(nicknameStr);
    }
  }, [nickname]);

  const fetchUserProfile = async (nickname: string) => {
    try {
      const response = await fetch(GET_USER_BY_NICKNAME_URL(nickname));
      if (!response.ok) throw new Error("Error al obtener el perfil del usuario");
      const userData = await response.json();
      setUser(userData);
      fetchFriends(userData.id);
      fetchGameHistory(userData.id);
    } catch (error) {
      console.error("❌ Error al obtener perfil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriends = async (userId: string) => {
    try {
      const response = await fetch(FRIENDSHIP_GET_BY_ID_URL(userId));
      if (!response.ok) throw new Error("Error al obtener la lista de amigos");
      const friendshipsData = await response.json();

      const extractedFriends: Friend[] = friendshipsData.flatMap((friendship: { sender: Friend; receiver: Friend }) => {
        const { sender, receiver } = friendship;
        const friends = [];
        if (sender.id !== userId) friends.push(sender);
        if (receiver.id !== userId) friends.push(receiver);
        return friends;
      });

      const uniqueFriends = Array.from(
        new Map(extractedFriends.map((friend: { id: string }) => [friend.id, friend])).values()
      );

      setFriends(uniqueFriends);
    } catch (error) {
      console.error("❌ Error al obtener amigos:", error);
    }
  };

  const fetchGameHistory = async (userId: string) => {
    try {
      const response = await fetch(GET_USER_HISTORY(userId));
      if (!response.ok) throw new Error("Error al obtener el historial de juegos");
      const gameHistory = await response.json();
      setGames(gameHistory);
    } catch (error) {
      console.error("❌ Error al obtener historial de juegos:", error);
    }
  };

  if (isLoading) {
    return <div className="text-white text-center">Cargando perfil...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#231356] text-white py-8">
        <Header2 />
        <div className="container mx-auto px-4">
          {user && (
            <div className="text-center mb-8">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarImage
                  src={
                    user?.avatarUrl
                      ? user.avatarUrl.startsWith("http")
                        ? user.avatarUrl
                        : `${API_BASE_URL}/${user.avatarUrl}`
                      : "/placeholder.svg"
                  }
                  alt={user?.nickname || "Usuario"}
                />
                <AvatarFallback>{user?.nickname?.slice(0, 1)?.toUpperCase() ?? "NA"}</AvatarFallback>
              </Avatar>
              <h1 className="text-3xl font-bold mt-4">{user?.nickname ?? "Usuario"}</h1>
              <p className="text-gray-300">{user?.mail ?? "Correo no disponible"}</p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-4 text-center">Amigos</h2>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {friends.length > 0 ? (
              friends.map((friend) => (
                <div
                  key={friend?.id || Math.random()}
                  onClick={() => router.push(`/profile/${friend.nickname}`)}
                  className="flex items-center gap-3 bg-[#1B0F40] p-4 rounded-lg cursor-pointer"
                >
                  <Avatar>
                    <AvatarImage
                      src={
                        friend?.avatarUrl
                          ? friend.avatarUrl.startsWith("http")
                            ? friend.avatarUrl
                            : `${API_BASE_URL}/${friend.avatarUrl}`
                          : "/placeholder.svg"
                      }
                      alt={friend?.nickname || "Amigo"}
                    />
                    <AvatarFallback>
                      {friend?.nickname?.slice(0, 1)?.toUpperCase() ?? "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-white">{friend?.nickname ?? "Amigo desconocido"}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400">
                Este usuario no tiene amigos aún.
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-4 text-center">Historial de Juegos</h2>
          <div className="space-y-4">
            {games.length > 0 ? (
              games.map((game) => (
                <div
                  key={game.id}
                  className="bg-[#1B0F40] p-4 rounded-lg cursor-pointer"
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  <p>Juego ID: {game.id}</p>
                  <p>
                    {user?.id}{" "}
                    <span
                      className={`${game.winner === game.playerId1
                        ? "text-green-400"
                        : "text-red-400"
                        }`}
                    >
                      {game.playerId1 || "Desconocido"}
                    </span>
                  </p>
                  <p>
                    Jugador 2:{" "}
                    <span
                      className={`${game.winner === game.playerId2
                        ? "text-green-400"
                        : "text-red-400"
                        }`}
                    >
                      {game.playerId2 || "Desconocido"}
                    </span>
                  </p>
                  <p className="text-green-500">
                    Ganador:{" "}
                    {game.winner
                      ? game.winner === user?.id
                        ? "Tú"
                        : "Oponente"
                      : "Sin definir"}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400">No hay juegos registrados.</div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}