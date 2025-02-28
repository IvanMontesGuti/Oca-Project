"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface FriendRequest {
  id: string;
  senderId: string;
}

interface Lobby {
  id: string;
  hostId: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  sendFriendRequest: (receiverId: string) => void;
  respondFriendRequest: (senderId: string, accepted: boolean) => void;
  createLobby: () => void;
  inviteToLobby: (lobbyId: string, receiverId: string) => void;
  respondLobbyInvitation: (lobbyId: string, accepted: boolean) => void;
  lobbies: Lobby[];
  friendRequests: FriendRequest[];
  connectedUsers: number;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<number>(0);
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`);
      setSocket(ws);

      ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        toast.success("Conectado", { duration: 3000, icon: "🌐" });
        ws.send(JSON.stringify({ Type: "viewPendingRequests" }));
      };

      ws.onclose = () => {
        console.log("❌ WebSocket Disconnected");
        toast.error("Desconectado del servidor", { duration: 3000, icon: "🔌" });
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket Error", error);
        toast.error("Error de conexión", { duration: 3000, icon: "⚠️" });
      };

      ws.onmessage = (event) => handleWebSocketMessages(event.data);

      return () => {
        ws.close();
      };
    }
  }, [userId]);

  const handleWebSocketMessages = (data: string) => {
    try {
      const message = JSON.parse(data);

      switch (message.Type) {
        case "viewPendingRequests":
          console.log("📩 Solicitudes pendientes recibidas:", message.Requests);
          setFriendRequests(message.Requests.map((req: any) => ({
            id: String(req.SenderId),
            senderId: String(req.SenderId),
          })));
          break;

        case "friendRequestReceived":
          toast.info(`Nueva solicitud de amistad de ${message.senderNickname}`, { duration: 5000, icon: "👥" });
          setFriendRequests((prev) => [...prev, { id: message.requestId, senderId: message.senderId }]);
          break;

        case "friendRequestAccepted":
          toast.success(`${message.senderNickname} aceptó tu solicitud de amistad`, { duration: 5000, icon: "✅" });
          setFriendRequests((prev) => prev.filter((req) => req.senderId !== message.senderId));
          break;

        case "friendRequestRejected":
          toast.error(`${message.senderNickname} rechazó tu solicitud de amistad`, { duration: 5000, icon: "❌" });
          setFriendRequests((prev) => prev.filter((req) => req.senderId !== message.senderId));
          break;

        case "userConnected":
          setConnectedUsers((prev) => prev + 1);
          break;

        case "userDisconnected":
          setConnectedUsers((prev) => prev - 1);
          break;

        case "lobbyCreated":
          console.log("🏠 Nueva lobby creada:", message);
          setLobbies((prev) => [...prev, { id: message.lobbyId, hostId: message.hostId }]);
          toast.success("Lobby creada con éxito", { duration: 3000, icon: "🎮" });
          break;

        case "lobbyInvitation":
          handleLobbyInvitation(message);
          break;

        case "lobbyInvitationResponse":
          handleLobbyInvitationResponse(message);
          break;

        default:
          console.log("📩 Mensaje recibido:", message);
          break;
      }
    } catch (error) {
      console.error("⚠️ Error procesando el mensaje WebSocket", error);
    }
  };

  const sendFriendRequest = (receiverId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      Type: "sendFriendRequest",
      SenderId: String(userId),
      ReceiverId: String(receiverId),
    });

    console.log("📨 Enviando solicitud de amistad:", message);
    socket.send(message);
    toast.info("Solicitud de amistad enviada", { duration: 3000, icon: "📤" });
  };

  const respondFriendRequest = (senderId: string, accepted: boolean) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      Type: "respondFriendRequest",
      SenderId: String(senderId),
      ReceiverId: String(userId),
      Accepted: accepted,
    });

    console.log("📨 Respondiendo solicitud de amistad:", message);
    socket.send(message);

    setFriendRequests((prev) => prev.filter((req) => req.senderId !== senderId));

    toast[accepted ? "success" : "info"](
      accepted ? "Solicitud de amistad aceptada" : "Solicitud de amistad rechazada",
      { duration: 3000, icon: accepted ? "🤝" : "👋" }
    );
  };

  const createLobby = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      Type: "createLobby",
      HostId: String(userId),
    });

    console.log("🏠 Creando lobby:", message);
    socket.send(message);
    toast.info("Creando lobby...", { duration: 3000, icon: "🎮" });
  };

  const inviteToLobby = (lobbyId: string, receiverId: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      Type: "lobbyInvitation",
      LobbyId: lobbyId,
      SenderId: String(userId),
      ReceiverId: String(receiverId),
    });

    console.log("📩 Enviando invitación a la lobby:", message);
    socket.send(message);
    toast.info("Invitación enviada", { duration: 3000, icon: "🎮" });
  };

  const respondLobbyInvitation = (lobbyId: string, accepted: boolean) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const message = JSON.stringify({
      Type: "lobbyInvitationResponse",
      SenderId: String(userId),
      ReceiverId: String(userId), 
      LobbyId: lobbyId,
      Status: accepted ? "accepted" : "rejected",
      Message: accepted
        ? "La invitación para unirte al lobby ha sido aceptada."
        : "La invitación para unirte al lobby ha sido rechazada.",
    });

    console.log("📨 Respondiendo invitación a la lobby:", message);
    socket.send(message);

    toast[accepted ? "success" : "info"](
      accepted ? "Invitación aceptada" : "Invitación rechazada",
      { duration: 3000, icon: accepted ? "✅" : "❌" }
    );
  };

  const handleLobbyInvitation = (message: any) => {
    toast(
      (t) => (
        <div className="flex flex-col">
          <p>🎮 {message.senderNickname} te ha invitado a un lobby</p>
          <div className="flex justify-between mt-2">
            <button
              className="bg-green-500 text-white px-4 py-2 rounded"
              onClick={() => {
                respondLobbyInvitation(message.lobbyId, true);
                toast.dismiss(t);
              }}
            >
              Aceptar
            </button>
            <button
              className="bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => {
                respondLobbyInvitation(message.lobbyId, false);
                toast.dismiss(t);
              }}
            >
              Rechazar
            </button>
          </div>
        </div>
      ),
      { duration: 30000 }
    );
  };

  const handleLobbyInvitationResponse = (message: any) => {
    
    toast.info(`${message.Message}`, { duration: 5000, icon: "🎮" });

    
    toast[message.Status === "accepted" ? "success" : "info"](
      `Tu invitación ha sido ${message.Status === "accepted" ? "aceptada" : "rechazada"}`,
      { duration: 3000, icon: message.Status === "accepted" ? "✅" : "❌" }
    );
  };

  return (
    <WebSocketContext.Provider value={{
      socket,
      sendFriendRequest,
      respondFriendRequest,
      createLobby,
      inviteToLobby,
      respondLobbyInvitation,
      lobbies,
      friendRequests,
      connectedUsers
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
