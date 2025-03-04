"use client";

import { GET_COUNT_STATUS } from "@/lib/endpoints/config";
import React, { useState, useEffect } from "react";
import { useWebSocket } from "@/context/WebSocketContext";
import { useAuth } from "@/context/AuthContext";

export function WebInfo() {
  const { userInfo } = useAuth();
  const userId = userInfo?.id ? String(userInfo.id) : userInfo?.unique_name;
  const { socket, sendMessage} = useWebSocket();
  const [connectedUsers, setConnectedUsers] = useState<number | null>(null);
  const [usersInGame, setUsersInGame] = useState<number | null>(null);
  const [disconnectedUsers, setDisconnectedUsers] = useState<number | null>(null);

  const fetchStatusCounts = async () => {
    try {

      const inGameResponse = await fetch(GET_COUNT_STATUS(3));
      if (inGameResponse.ok) {
        const inGameData = await inGameResponse.json();
        setUsersInGame(inGameData);
      }

      const disconnectedResponse = await fetch(GET_COUNT_STATUS(0));
      if (disconnectedResponse.ok) {
        const disconnectedData = await disconnectedResponse.json();
        setDisconnectedUsers(disconnectedData);
      }
    } catch (error) {
      console.error("Error al obtener contadores de estado:", error);
    }
  };

  useEffect(() => {

    fetchStatusCounts();

    const intervalId = setInterval(fetchStatusCounts, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.Type === "connectedCount") {
          setConnectedUsers(message.Count);
          console.log("Connected users:", message.Count);
        }
      } catch (error) {
        console.error("Error procesando el mensaje WebSocket:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  return (
    <div className="flex items-center gap-4 text-sm text-gray-300">
      <span>
        <strong className="text-white">{connectedUsers !== null ? usersInGame : "1"}</strong> Personas conectadas
      </span>
      <span>
        <strong className="text-white">{usersInGame !== null ? usersInGame : "0"}</strong> Personas en partida
      </span>
      <span>
        <strong className="text-white">{disconnectedUsers !== null ? disconnectedUsers : "0"}</strong> Personas desconectadas
      </span>
    </div>
  );
}