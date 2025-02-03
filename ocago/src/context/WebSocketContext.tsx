"use client";

import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

interface WebSocketContextType {
  socket: WebSocket | null;
  sendFriendRequest: (receiverId: string) => void;
  respondFriendRequest: (senderId: string, accepted: boolean) => void;
}

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) =>  {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const {userId} = useAuth();
  
  useEffect(() => {
    if (userId) {
      const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`);
      setSocket(ws);

      ws.onopen = () => console.log("✅ WebSocket Connected");
      ws.onclose = () => console.log("❌ WebSocket Disconnected");
      ws.onerror = (error) => console.error("⚠️ WebSocket Error", error);

      return () => {
        ws.close();
      };
    }
  }, [userId]);

  const sendFriendRequest = (receiverId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "sendFriendRequest", senderId: userId, receiverId });
      socket.send(message);
    }
  };

  const respondFriendRequest = (senderId: string, accepted: boolean) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: "respondFriendRequest", senderId, receiverId: userId, accepted });
      socket.send(message);
    }
  };

  return (
    <WebSocketContext.Provider value={{ socket, sendFriendRequest, respondFriendRequest }}>
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