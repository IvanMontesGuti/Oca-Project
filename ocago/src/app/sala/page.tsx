"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Header2 } from "@/components/navUser";
import { InviteFriendsModal } from "@/components/invite-friends-modal";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API_BASE_URL } from "@/lib/endpoints/config";
import type { Player, RoomState } from "@/types/room";

export default function GameRoom() {
  const router = useRouter();
  const { socket } = useWebSocket();
  const { userInfo, isAuthenticated } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    players: [],
    isGameStarted: false,
  });

  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // 🔍 Esperar a que `userInfo` se cargue
  useEffect(() => {
    if (userInfo) {
      console.log("✅ User Info cargado:", userInfo);
      setIsLoadingUser(false);
    } else {
      console.log("❌ User Info no disponible, esperando...");
    }
  }, [userInfo]);

  // 🔄 Manejo del WebSocket
  useEffect(() => {
    if (!socket || isLoadingUser) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje WebSocket recibido:", data);

      switch (data.Type) {
        case "playerJoined":
          setRoomState((prev) => ({
            ...prev,
            players: [
              ...prev.players,
              {
                id: data.PlayerId,
                nickname: data.PlayerNickname,
                avatarUrl: data.PlayerAvatarUrl,
              },
            ],
          }));
          break;
        case "playerLeft":
          setRoomState((prev) => ({
            ...prev,
            players: prev.players.filter((player) => player.id !== data.PlayerId),
          }));
          break;
        case "gameStarted":
          setRoomState((prev) => ({
            ...prev,
            isGameStarted: true,
          }));
          router.push("/game"); // Redirige al juego
          break;
      }
    };

    socket.addEventListener("message", handleWebSocketMessage);

    return () => {
      socket.removeEventListener("message", handleWebSocketMessage);
    };
  }, [socket, router, isLoadingUser]);

  // ⏳ Muestra un mensaje de carga mientras `userInfo` se obtiene
  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066FF] text-white text-2xl">
        Cargando datos del usuario...
      </div>
    );
  }

  // 🚀 Función para iniciar el juego
  const handleStartGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "startGame",
        SenderId: userInfo.id.toString(),
      });
      socket.send(message);
    }
  };

  // 🎭 Renderizar jugadores
  const renderPlayer = (player?: Player, isWaiting = false) => (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-32 h-32">
          {isWaiting ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-sm rounded-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <AvatarImage
                src={player?.avatarUrl ? `${API_BASE_URL}/${player.avatarUrl}` : undefined}
                alt={player?.nickname || "Avatar"}
              />
              <AvatarFallback>{player?.nickname ? player.nickname.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
            </>
          )}
        </Avatar>
      </div>
      <span className="text-xl font-bold text-white">{isWaiting ? "Buscando oponente..." : player?.nickname}</span>
    </div>
  );

  const canStartGame = roomState.players.length === 2;

  return (
    <div className="min-h-screen bg-[#0066FF]">
      <Header2 />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          <Button onClick={() => setIsInviteModalOpen(true)} className="bg-[#231356] text-white hover:bg-[#2d1a6b]">
            Invitar amigo
          </Button>
        </div>

        <div className="flex flex-col items-center gap-16">
          <div className="flex items-center gap-16">
            {renderPlayer(roomState.players[0])}
            <span className="text-4xl font-bold text-[#FFFF00]">VS</span>
            {renderPlayer(roomState.players[1], roomState.players.length < 2)}
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="bg-[#CCFF00] text-black hover:bg-[#b3e600] disabled:bg-gray-400"
            >
              Comenzar partida
            </Button>
            <Link href="/menu">
              <Button variant="outline" className="bg-black text-white hover:bg-gray-900">
                Abandonar sala
              </Button>
            </Link>
          </div>
        </div>

        <InviteFriendsModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
      </main>
    </div>
  );
}
