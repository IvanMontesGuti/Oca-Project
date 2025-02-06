"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

interface FriendRequest {
  id: string;
  senderId: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  sendFriendRequest: (receiverId: string) => void;
  respondFriendRequest: (senderId: string, accepted: boolean) => void;
  friendRequests: FriendRequest[];
  connectedUsers: number;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [connectedUsers, setConnectedUsers] = useState<number>(0); 
  const { userId } = useAuth();

  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`);
      setSocket(ws);

      ws.onopen = () => {
        console.log("✅ WebSocket Connected");
        toast.success("Conectado", {
          duration: 3000,
          icon: "🌐",
        });
        ws.send(JSON.stringify({ Type: "viewPendingRequests" }));
      };

      ws.onclose = () => {
        console.log("❌ WebSocket Disconnected");
        toast.error("Desconectado del servidor", {
          duration: 3000,
          icon: "🔌",
        });
      };

      ws.onerror = (error) => {
        console.error("⚠️ WebSocket Error", error);
        toast.error("Error de conexión", {
          duration: 3000,
          icon: "⚠️",
        });
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
          setFriendRequests(
            message.Requests.map((req: any) => ({
              id: String(req.SenderId), 
              senderId: String(req.SenderId),
            }))
          );
          break;

        case "friendRequestReceived":
          toast.info(`Nueva solicitud de amistad de ${message.senderNickname}`, {
            duration: 5000,
            icon: "👥",
          });
          setFriendRequests((prev) => [
            ...prev,
            {
              id: message.requestId,
              senderId: message.senderId,
            },
          ]);
          break;

        case "friendRequestAccepted":
          toast.success(`${message.senderNickname} aceptó tu solicitud de amistad`, {
            duration: 5000,
            icon: "✅",
          });
          setFriendRequests((prev) => prev.filter((req) => req.senderId !== message.senderId));
          break;

        case "friendRequestRejected":
          toast.error(`${message.senderNickname} rechazó tu solicitud de amistad`, {
            duration: 5000,
            icon: "❌",
          });
          setFriendRequests((prev) => prev.filter((req) => req.senderId !== message.senderId));
          break;

        case "userConnected":
          setConnectedUsers((prev) => prev + 1);
          break;

        case "userDisconnected":
          setConnectedUsers((prev) => prev - 1);
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
    toast.info("Solicitud de amistad enviada", {
      duration: 3000,
      icon: "📤",
    });
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
    
    if (accepted) {
      toast.success("Solicitud de amistad aceptada", {
        duration: 3000,
        icon: "🤝",
      });
    } else {
      toast.info("Solicitud de amistad rechazada", {
        duration: 3000,
        icon: "👋",
      });
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, sendFriendRequest, respondFriendRequest, friendRequests, connectedUsers }}>
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