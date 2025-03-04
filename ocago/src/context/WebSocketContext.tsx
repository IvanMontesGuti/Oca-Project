"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { API_BASE_SOCKET_URL } from "@/lib/endpoints/config";

interface Friend {
  id: string;
  nickname: string;
  status: number;
  avatarUrl: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  sendMessage: (message: object) => void;
  sendInvitation: (receiverId: string) => void;
  respondInvitation: (matchRequestId: string, accepted: boolean) => void;
  friendRequests: Friend[];
  friends: Friend[];
  fetchPendingRequests: () => void;
  fetchFriends: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { userId, userInfo } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`${API_BASE_SOCKET_URL}/socket/${userId}`);
      setSocket(ws);

      ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        toast.success("Conectado al servidor", { duration: 3000, icon: "🌐" });
        fetchPendingRequests();
        fetchFriends();
      };

      ws.onmessage = (event) => handleWebSocketMessages(event.data);

      ws.onclose = () => {
        console.log("❌ WebSocket Disconnected");
        toast.error("Desconectado del servidor", { duration: 3000, icon: "🔌" });
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket Error", error);
        toast.error("Error de conexión", { duration: 3000, icon: "⚠️" });
      };

      return () => {
        ws.close();
      };
    }
  }, [userId]);

  const handleWebSocketMessages = (data: string) => {
    try {
      const message = JSON.parse(data);
      switch (message.Type) {

        case "pendingFriendRequests":
          setFriendRequests(message.Requests.map((req: { Id: string; Nickname: string }) => ({ id: String(req.Id), nickname: req.Nickname })));
          break;
        case "sendFriendRequest":
          console.log("📩 Solicitud de amistad recibida:", message);

          if (!message.SenderId) {
            console.error("⚠️ Error: SenderId es undefined en sendFriendRequest:", message);
            return;
          }

          toast.custom(() => (
            <div className="flex flex-col bg-[#1B0F40] text-white p-4 rounded-lg">
              <p className="text-white">
                📩 Has recibido una solicitud de amistad de <strong>{message.SenderNickname}</strong>
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    sendMessage({
                      Type: "respondFriendRequest",
                      SenderId: String(userId),
                      ReceiverId: String(message.SenderId),
                      Accepted: true, // Aceptar solicitud
                    });
                    toast.dismiss();
                  }}
                >
                  Aceptar
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    sendMessage({
                      Type: "respondFriendRequest",
                      SenderId: String(userId),
                      ReceiverId: String(message.SenderId),
                      Accepted: false, // Rechazar solicitud
                    });
                    toast.dismiss();
                  }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ), { duration: 10000 });

          break;
        case "friendsList":
          setFriends(message.Friends.map((friend: { Id: string; Nickname: string; Status: number; avatarUrl: string }) => ({
            id: String(friend.Id),
            nickname: friend.Nickname,
            status: friend.Status,
            avatarUrl: friend.avatarUrl
          })));
          break;
        case "invitationSent":
          console.log("📨 Invitación enviada:", message);

          if (message.MatchRequestId) {
            router.push(`/sala/${message.MatchRequestId}`);
          } else {
            console.error("⚠️ No se recibió MatchRequestId en invitationSent");
          }
          break;

        case "invitationReceived":
          console.log("📩 Invitación recibida:", message);

          if (!message.MatchRequestId) {
            console.error("⚠️ Error: MatchRequestId es undefined en invitationReceived:", message);
            return;
          }

          // Si el usuario es el host, redirigirlo también
          if (userInfo?.id === message.HostId) {
            console.log("🏆 El host también se une a la sala.");
            router.push(`/sala/${message.MatchRequestId}`);
          }

          toast.custom(() => (
            <div className="flex flex-col bg-[#1B0F40] text-white p-4 rounded-lg">
              <p className="text-white">
                🎮 Invitación de partida de <strong>{message.HostNickname}</strong>
              </p>
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    sendMessage({
                      Type: "respondInvitation",
                      SenderId: String(userId),
                      matchRequestId: message.MatchRequestId,
                      Accepted: true,
                    });
                    router.push(`/sala/${message.MatchRequestId}`); // Redirigir al guest también
                    toast.dismiss();
                  }}
                >
                  Aceptar
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    sendMessage({
                      Type: "respondInvitation",
                      SenderId: String(userId),
                      matchRequestId: message.MatchRequestId,
                      Accepted: false,
                    });
                    toast.dismiss();
                  }}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ), { duration: 10000 });
          break;



        case "invitationResponse":
          toast.info(message.Message, { duration: 5000, icon: message.Accepted ? "✔️" : "❌" });
          break;
        case "startGame":
          toast.success("🎮 La partida ha comenzado!", { duration: 5000, icon: "🚀" });
          break;
        default:
          console.log("📩 Mensaje recibido:", message);
          break;
      }
    } catch (error) {
      console.error("⚠️ Error procesando el mensaje WebSocket", error);
    }
  };

  const sendMessage = (message: object) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        const jsonMessage = JSON.stringify(message);
        socket.send(jsonMessage);
        console.log("📨 Mensaje enviado:", jsonMessage);
      } catch (error) {
        console.error("⚠️ Error al enviar el mensaje WebSocket:", error);
      }
    } else {
      console.warn("⚠️ No hay conexión WebSocket activa.");
    }
  };

  const sendInvitation = (receiverId: string) => {
    if (!userId) return;
    sendMessage({
      type: "sendInvitation",
      senderId: String(userId),
      receiverId: receiverId,
      HostNickname: String(userId)
    });
  };

  const respondInvitation = (matchRequestId: string, accepted: boolean) => {
    if (!userId) return;
    sendMessage({
      Type: "respondInvitation",
      SenderId: String(userId),
      matchRequestId: matchRequestId,
      Accepted: accepted
    });
  };

  const fetchPendingRequests = () => {
    if (userId) {
      sendMessage({ type: "getPendingFriendRequests", userId: String(userId) });
    }
  };

  const fetchFriends = () => {
    if (userId) {
      sendMessage({ type: "getFriends", senderId: String(userId) });
    }
  };


  return (
    <WebSocketContext.Provider value={{
      socket,
      sendMessage,
      sendInvitation,
      respondInvitation,
      friendRequests,
      friends,
      fetchPendingRequests,
      fetchFriends
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
