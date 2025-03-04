"use client";

import { GET_COUNT_STATUS } from "@/lib/endpoints/config";
import React, { useState, useEffect } from "react";


export function WebInfo() {
  
  const [connectedUsers, setConnectedUsers] = useState<number | null>(null);
  const [usersInGame, setUsersInGame] = useState<number | null>(null);
  const [disconnectedUsers, setDisconnectedUsers] = useState<number | null>(null);

  const fetchStatusCounts = async () => {
    try {

      const connectedResponse = await fetch(GET_COUNT_STATUS(1));
      if (connectedResponse.ok) {
        const connectedData = await connectedResponse.json();
        setConnectedUsers(connectedData);
      }

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

    const intervalId = setInterval(fetchStatusCounts, 15000);

    return () => clearInterval(intervalId);
  }, []);


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