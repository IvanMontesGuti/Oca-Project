"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface Friend {
  id: string;
  nickname: string;
}

interface WebSocketContextType {
  socket: WebSocket | null;
  sendMessage: (message: object) => void;
  friendRequests: Friend[];
  friends: Friend[];
  fetchPendingRequests: () => void;
  fetchFriends: () => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userId } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [friendRequests, setFriendRequests] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`);
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
          setFriendRequests(message.Requests.map((req: any) => ({ id: String(req.Id), nickname: req.Nickname })));
          break;
        case "friendRequestReceived":
          toast.info(`📩 Tienes una nueva solicitud de amistad de ${message.Nickname}`, { duration: 5000, icon: "👥" });
          setFriendRequests((prev) => [...prev, { id: String(message.Id), nickname: message.Nickname }]);
          toast.info(`Nueva solicitud de amistad de ${message.Nickname}`, { duration: 5000, icon: "👥" });
          break;
        case "friendsList":
          setFriends(message.Friends.map((friend: any) => ({ id: String(friend.Id), nickname: friend.Nickname })));
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
    <WebSocketContext.Provider value={{ socket, sendMessage, friendRequests, friends, fetchPendingRequests, fetchFriends }}>
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
