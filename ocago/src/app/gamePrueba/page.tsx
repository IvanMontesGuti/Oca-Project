"use client"

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import useWebSocket from "react-use-websocket";

const userId = "Ivan"; // Debe venir del contexto del usuario
const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`;

export default function GameBoard() {
  const [gameState, setGameState] = useState<{
    currentPlayer: string;
    remainingThrows: number;
    positions: { [key: string]: number };
    diceValue: number | null;
  }>({
    currentPlayer: "",
    remainingThrows: 1,
    positions: {},
    diceValue: null,
  });
 
  const [gameId, setGameId] = useState(null);

  const { sendMessage } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      if (data.action === "gameUpdate" || data.action === "moveUpdate") {
        setGameState({
          currentPlayer: data.data.IsPlayer1Turn ? data.data.Player1Id : data.data.Player2Id,
          remainingThrows: 1,
          positions: {
            [data.data.Player1Id]: data.data.Player1Position,
            [data.data.Player2Id]: data.data.Player2Position,
          },
          diceValue: null,
        });
        if (!gameId) {
          setGameId(data.data.Id);
        }
      }
    },
  });

  const createGame = () => {
    sendMessage(JSON.stringify({ Action: "CreateGame" }));
  };

  const joinGame = () => {
    if (gameId) {
      sendMessage(JSON.stringify({ Action: "JoinGame", GameId: gameId }));
    }
  };

  const rollDice = () => {
    if (gameId) {
      sendMessage(JSON.stringify({ Action: "MakeMove", GameId: gameId }));
    }
  };

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      <div className="text-white/80 text-sm mb-4">ID Sala: {gameId || "Creando..."}</div>
      <div className="text-white text-xl mb-8">TURNO: {gameState.currentPlayer}</div>
      
      <div className="flex-1 flex items-center justify-center relative">
        <Image src="/images/tablero.svg" alt="Tablero" width={800} height={800} className="object-contain" />
        {Object.entries(gameState.positions).map(([player, position]) => (
          <div key={player} className="absolute" style={{ top: `${position * 10}px`, left: `${position * 10}px` }}>
            🟢
          </div>
        ))}
      </div>
      
      <div className="flex gap-4 mt-4">
        <Button onClick={createGame}>Crear Juego</Button>
        <Button onClick={joinGame} disabled={!gameId}>Unirse al Juego</Button>
        <Button onClick={rollDice} disabled={!gameId || gameState.remainingThrows === 0}>TIRAR DADO</Button>
      </div>
    </div>
  );
}
