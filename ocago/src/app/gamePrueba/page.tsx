"use client"

import { useState } from "react";
import useWebSocket from "react-use-websocket";
import { Button } from "@/components/ui/button";
import Tablero from "@/components/tablero";

const userId = "Ivan";
const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`;

export default function GameBoard() {
  const [gameId, setGameId] = useState(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const { sendMessage } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Mensaje WebSocket recibido:", data);
      if (data.action === "gameUpdate") {
        setGameId(data.data.Id);
        actualizarFichas(data.data);
      } else if (data.action === "moveUpdate") {
        animateMovement(data.data.PlayerId, data.data.NewPosition);
      }
    },
  });

  interface Casilla {
    casillaX: number;
    casillaY: number;
    playerId?: string;
  }

  interface Ficha {
    playerId: string;
    casillaX: number;
    casillaY: number;
    position: number;
    color: string;
  }

  const casillas: Record<number, Casilla> = {
    1: { casillaX: 3, casillaY: 7 }, 2: { casillaX: 4, casillaY: 7 },
    3: { casillaX: 5, casillaY: 7 }, 4: { casillaX: 6, casillaY: 7 },
  5: { casillaX: 7, casillaY: 7 }, 6: { casillaX: 8, casillaY: 7 },
  7: { casillaX: 9, casillaY: 7 }, 8: { casillaX: 10, casillaY: 7 },
  9: { casillaX: 11, casillaY: 7 }, 10: { casillaX: 11, casillaY: 6 },
  11: { casillaX: 11, casillaY: 5 }, 12: { casillaX: 11, casillaY: 4 },
  13: { casillaX: 11, casillaY: 3 }, 14: { casillaX: 11, casillaY: 2 },
  15: { casillaX: 11, casillaY: 1 }, 16: { casillaX: 11, casillaY: 0 },
  17: { casillaX: 10, casillaY: 0 }, 18: { casillaX: 9, casillaY: 0 },
  19: { casillaX: 8, casillaY: 0 }, 20: { casillaX: 7, casillaY: 0 },
  21: { casillaX: 6, casillaY: 0 }, 22: { casillaX: 5, casillaY: 0 },
  23: { casillaX: 4, casillaY: 0 }, 24: { casillaX: 3, casillaY: 0 },
  25: { casillaX: 2, casillaY: 0 }, 26: { casillaX: 1, casillaY: 0 },
  27: { casillaX: 0, casillaY: 0 }, 28: { casillaX: 0, casillaY: 1 },
  29: { casillaX: 0, casillaY: 2 }, 30: { casillaX: 0, casillaY: 3 },
  31: { casillaX: 0, casillaY: 4 }, 32: { casillaX: 0, casillaY: 5 },
  33: { casillaX: 0, casillaY: 6 }, 34: { casillaX: 1, casillaY: 6 },
  35: { casillaX: 2, casillaY: 6 }, 36: { casillaX: 3, casillaY: 6 },
  37: { casillaX: 4, casillaY: 6 }, 38: { casillaX: 5, casillaY: 6 },
  39: { casillaX: 6, casillaY: 6 }, 40: { casillaX: 7, casillaY: 6 },
  41: { casillaX: 8, casillaY: 6 }, 42: { casillaX: 9, casillaY: 6 },
  43: { casillaX: 10, casillaY: 6 }, 44: { casillaX: 10, casillaY: 5 },
  45: { casillaX: 10, casillaY: 4 }, 46: { casillaX: 10, casillaY: 3 },
  47: { casillaX: 10, casillaY: 2 }, 48: { casillaX: 10, casillaY: 1 },
  49: { casillaX: 9, casillaY: 1 }, 50: { casillaX: 8, casillaY: 1 },
  51: { casillaX: 7, casillaY: 1 }, 52: { casillaX: 6, casillaY: 1 },
  53: { casillaX: 5, casillaY: 1 }, 54: { casillaX: 4, casillaY: 1 },
  55: { casillaX: 3, casillaY: 1 }, 56: { casillaX: 2, casillaY: 1 },
  57: { casillaX: 1, casillaY: 1 }, 58: { casillaX: 1, casillaY: 2 },
  59: { casillaX: 1, casillaY: 3 }, 60: { casillaX: 1, casillaY: 4 },
  61: { casillaX: 1, casillaY: 5 }, 62: { casillaX: 2, casillaY: 5 },
    63: { casillaX: 4, casillaY: 5 }
  };

  interface GameData {
    Player1Id: string;
    Player1Position: number | null;
    Player2Id: string;
    Player2Position: number | null;
  }

  const actualizarFichas = (data: GameData) => {
    setFichas([
      data.Player1Position !== null && casillas[data.Player1Position] ? {
        playerId: data.Player1Id,
        casillaX: casillas[data.Player1Position].casillaX,
        casillaY: casillas[data.Player1Position].casillaY,
        position: data.Player1Position,
        color: "red"
      } : null,
      data.Player2Id && data.Player2Position !== null && casillas[data.Player2Position] ? {
        playerId: data.Player2Id,
        casillaX: casillas[data.Player2Position].casillaX,
        casillaY: casillas[data.Player2Position].casillaY,
        position: data.Player2Position,
        color: "blue"
      } : null
    ].filter(Boolean) as Ficha[]);
  };

  const animateMovement = (playerId: string, newPosition: number) => {
    if (!casillas[newPosition]) return;
    const path: Casilla[] = [];
    for (let i = fichas.find(f => f.playerId === playerId)?.position || 1; i <= newPosition; i++) {
      if (casillas[i]) {
        path.push({ ...casillas[i], playerId });
      }
    }

    path.forEach((pos, index) => {
      setTimeout(() => {
        setFichas(prevFichas => prevFichas.map(f => f.playerId === playerId ? { ...f, casillaX: pos.casillaX, casillaY: pos.casillaY, position: newPosition } : f));
      }, index * 300);
    });
  };

  const rollDice = () => {
    if (gameId) {
      sendMessage(JSON.stringify({ Action: "MakeMove", GameId: gameId }));
    }
  };

  const createGame = () => {
    sendMessage(JSON.stringify({ Action: "CreateGame" }));
  };

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      <div className="text-white/80 text-sm mb-4">ID Sala: {gameId || "Creando..."}</div>
      <Tablero fichas={fichas} />
      <Button onClick={createGame}>Crear Partida</Button>
      <Button onClick={rollDice} disabled={!gameId}>Tirar Dado</Button>
    </div>
  );
}
