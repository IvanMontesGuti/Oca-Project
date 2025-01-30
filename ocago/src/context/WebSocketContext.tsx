"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const WebSocketContext = createContext<WebSocket | null>(null);

export const WebSocketProvider = ({ userId, children }: { userId: string | null; children: React.ReactNode }) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

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

  return <WebSocketContext.Provider value={socket}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  return useContext(WebSocketContext);
};