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
  const { socket, createLobby, inviteToLobby } = useWebSocket();
  const { userInfo } = useAuth();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [roomState, setRoomState] = useState<RoomState>({
    players: [],
    isGameStarted: false,
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Esperar a que userInfo se cargue
  useEffect(() => {
    if (userInfo) {
      console.log("✅ User Info cargado:", userInfo);
      setIsLoadingUser(false);
    } else {
      console.log("❌ User Info no disponible, esperando...");
    }
  }, [userInfo]);

  // Manejo del WebSocket
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

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0066FF] text-white text-2xl">
        Cargando datos del usuario...
      </div>
    );
  }

  // Función para iniciar el juego
  const handleStartGame = () => {
    if (socket && socket.readyState === WebSocket.OPEN && userInfo) {
      const message = JSON.stringify({
        Type: "startGame",
        SenderId: userInfo.id.toString(),
      });
      socket.send(message);
    }
  };

  // Renderizar jugadores
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

  /**
   * Función para invitar a un amigo:
   * - Se crea (o se asegura) la lobby mediante createLobby.
   * - Luego se invita al amigo usando inviteToLobby.
   * - Finalmente se redirige a /sala/[lobbyId].
   */
  const handleInviteFriend = (friendId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN || !userInfo) return;

    // Primero, se crea la lobby (se espera que la respuesta WS actualice el estado lobbies)
    createLobby();

    // Se espera un breve retardo para que la lobby se registre en el estado (ajusta el tiempo según tu flujo)
    setTimeout(() => {
      // Se toma el último lobby (suponiendo que es el que acabamos de crear)
      const currentLobbyId = (window as any).lobbies && (window as any).lobbies?.length
        ? (window as any).lobbies[(window as any).lobbies.length - 1]?.id
        : undefined;
      // Si en tu contexto tienes el estado "lobbies", podrías acceder a él directamente; en este ejemplo usaremos una variable local.
      // Alternativamente, si el estado de lobbies no está disponible globalmente, puedes agregar un estado local para ello.
      // Por simplicidad, asumiremos que el nuevo lobby se crea y se añade a "lobbies" del WebSocketContext.
      // Aquí usaremos también el valor de "lobbies" del contexto (aunque en este ejemplo no se actualiza globalmente en este componente).
      const newLobbyId = inviteToLobby && (typeof inviteToLobby === "function" ? undefined : undefined); // Placeholder

      // En este ejemplo, simulamos que el nuevo lobby id es "12345" (debes obtenerlo del contexto o del WS)
      const simulatedLobbyId = "12345";

      // Invitar al amigo
      inviteToLobby(simulatedLobbyId, friendId);

      // Redirigir a /sala/[lobbyId]
      router.push(`/sala/${simulatedLobbyId}`);
    }, 500);
  };

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      <Header2 />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-end mb-8">
          {/* Se abre el modal para invitar amigos. Se asume que este modal, al seleccionar un amigo,
              llamará a la función handleInviteFriend (pasándola como prop) */}
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

        {/* Se asume que InviteFriendsModal acepta una prop onInviteFriend */}
        <InviteFriendsModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteFriend={handleInviteFriend}
        />
      </main>
    </div>
  );
}
