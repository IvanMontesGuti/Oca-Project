"use client";

import { GET_COUNT_STATUS } from "@/lib/endpoints/config";
import React, { useState, useEffect } from "react";
import { useWebSocket } from "@/context/WebSocketContext";
import { useAuth } from "@/context/AuthContext";

export function WebInfo() {
  const { userInfo } = useAuth();
  
  // Fix userId extraction - make sure it's properly cast to string
  const userId = userInfo?.id ? String(userInfo.id) : userInfo?.unique_name;
  
  const { socket } = useWebSocket();
  const [gameSocket, setGameSocket] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<number | null>(null);
  const [usersInGame, setUsersInGame] = useState<number | null>(null);
  const [activeGames, setActiveGames] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const countStatus = async (num: number): Promise<number> => {
    const url = GET_COUNT_STATUS(num);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      return data || 0;
    } catch (error) {
      console.error("Error al realizar la solicitud:", error);
      return 0;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const connected = await countStatus(1);
      const inGame = await countStatus(2);
      setConnectedUsers(connected + inGame);
      setUsersInGame(inGame);
    };

    fetchData();
  }, []);

  // Create a separate WebSocket connection for game data with retry logic
  useEffect(() => {
    // Don't attempt to connect if we don't have a userId
    if (!userId) return;
    
    // Close existing connection if there is one
    if (gameSocket) {
      gameSocket.close();
    }
    
    const connectWebSocket = () => {
      try {
        // Create the new WebSocket connection
        const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`;
        console.log(`Attempting to connect to: ${wsUrl}`);
        
        const newSocket = new WebSocket(wsUrl);
        
        // Set up event handlers
        newSocket.onopen = () => {
          console.log("Game WebSocket connected successfully");
          setWsConnected(true);
          setRetryCount(0); // Reset retry count on successful connection
          
          // Request active games immediately when connected
          try {
            newSocket.send(JSON.stringify({
              Action: "GetActiveGames"
            }));
            console.log("GetActiveGames request sent");
          } catch (error) {
            console.error("Error sending initial GetActiveGames request:", error);
          }
        };
        
        newSocket.onmessage = (event) => {
          try {
            console.log("Game WebSocket message received:", event.data);
            const message = JSON.parse(event.data);
            
            // Handle active games response
            if (message.action === "activeGames") {
              console.log("Active games data received:", message.data);
              setActiveGames(message.data);
            }
          } catch (error) {
            console.error("Error processing game WebSocket message:", error);
          }
        };
        
        newSocket.onerror = (error) => {
          console.error("Game WebSocket error:", error);
          setWsConnected(false);
        };
        
        newSocket.onclose = (event) => {
          console.log(`Game WebSocket closed: Code: ${event.code}, Reason: ${event.reason}`);
          setWsConnected(false);
          
          // Attempt to reconnect with exponential backoff, up to a reasonable limit
          if (retryCount < 5) {
            const timeout = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`Attempting to reconnect in ${timeout/1000} seconds...`);
            
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              connectWebSocket();
            }, timeout);
          } else {
            console.log("Max retry attempts reached. Giving up on WebSocket connection.");
          }
        };
        
        // Store the socket in state
        setGameSocket(newSocket);
      } catch (error) {
        console.error("Error creating WebSocket:", error);
      }
    };
    
    connectWebSocket();
    
    // Clean up function
    return () => {
      if (gameSocket && gameSocket.readyState !== WebSocket.CLOSED) {
        console.log("Closing game WebSocket on component unmount");
        gameSocket.close();
      }
    };
  }, [userId, retryCount]);

  // Set up interval to request active games periodically
  useEffect(() => {
    if (!gameSocket || gameSocket.readyState !== WebSocket.OPEN || !wsConnected) return;
    
    const requestActiveGames = () => {
      if (gameSocket.readyState === WebSocket.OPEN) {
        try {
          console.log("Sending periodic GetActiveGames request");
          gameSocket.send(JSON.stringify({
            Action: "GetActiveGames"
          }));
        } catch (error) {
          console.error("Error requesting active games:", error);
        }
      } else {
        console.warn("Cannot send GetActiveGames: WebSocket not open");
      }
    };
    
    // Set up interval (request every 30 seconds)
    const interval = setInterval(requestActiveGames, 300000000);
    
    return () => {
      clearInterval(interval);
    };
  }, [gameSocket, wsConnected]);

  // Still use the main socket for connected users if needed
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
        <strong className="text-white">{connectedUsers}</strong> Personas conectadas
      </span>
      <span>
        <strong className="text-white">{usersInGame}</strong> Personas en partida
      </span>
      <span>
        <strong className="text-white">{activeGames !== null ? activeGames : "0"}</strong> Partidas activas
      </span>
    </div>
  );
}