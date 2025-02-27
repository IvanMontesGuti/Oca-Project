"use client"

import { useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { Button } from "@/components/ui/button";
import Tablero from "@/components/tablero";

const userId = "Ivan";
const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`;

export default function GameBoard() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const { sendMessage, lastMessage } = useWebSocket(wsUrl, {
    onOpen: () => console.log("WebSocket conectado"),
    onError: (error) => console.error("Error de WebSocket:", error),
    retryOnError: true,
    shouldReconnect: () => true,
  });

  // Procesar mensajes WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        console.log("📩 Mensaje WebSocket recibido:", data);
        
        if (data.action === "gameUpdate") {
          setGameId(data.data.Id);
          actualizarFichas(data.data);
        } else if (data.action === "moveUpdate") {
          animateMovement(data.data.PlayerId, data.data.NewPosition);
        }
      } catch (error) {
        console.error("Error al procesar mensaje:", error);
      }
    }
  }, [lastMessage]);

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

  interface GameData {
    Id: string;
    Player1Id: string;
    Player1Position: number | null;
    Player2Id: string;
    Player2Position: number | null;
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

  const actualizarFichas = (data: GameData) => {
    const nuevasFichas: Ficha[] = [];
    
    if (data.Player1Id && data.Player1Position !== null && casillas[data.Player1Position]) {
      nuevasFichas.push({
        playerId: data.Player1Id,
        casillaX: casillas[data.Player1Position].casillaX,
        casillaY: casillas[data.Player1Position].casillaY,
        position: data.Player1Position,
        color: "red"
      });
    }
    
    if (data.Player2Id && data.Player2Position !== null && casillas[data.Player2Position]) {
      nuevasFichas.push({
        playerId: data.Player2Id,
        casillaX: casillas[data.Player2Position].casillaX,
        casillaY: casillas[data.Player2Position].casillaY,
        position: data.Player2Position,
        color: "blue"
      });
    }
    
    setFichas(nuevasFichas);
  };

  const animateMovement = (playerId: string, newPosition: number) => {
    if (!casillas[newPosition]) return;
    
    const fichaActual = fichas.find(f => f.playerId === playerId);
    if (!fichaActual) return;
    
    setIsAnimating(true);
    
    const posicionInicial = fichaActual.position;
    const path: number[] = [];
    
    // Crear un camino desde la posición actual hasta la nueva
    for (let i = posicionInicial + 1; i <= newPosition; i++) {
      if (casillas[i]) {
        path.push(i);
      }
    }
    
    // Animar el movimiento a través del camino
    let step = 0;
    const animateStep = () => {
      if (step < path.length) {
        const currentPos = path[step];
        
        setFichas(prevFichas => 
          prevFichas.map(f => 
            f.playerId === playerId 
              ? { 
                  ...f, 
                  casillaX: casillas[currentPos].casillaX, 
                  casillaY: casillas[currentPos].casillaY,
                  position: currentPos 
                } 
              : f
          )
        );
        
        step++;
        setTimeout(animateStep, 300);
      } else {
        // Actualizar a la posición final
        setFichas(prevFichas => 
          prevFichas.map(f => 
            f.playerId === playerId 
              ? { 
                  ...f, 
                  casillaX: casillas[newPosition].casillaX, 
                  casillaY: casillas[newPosition].casillaY,
                  position: newPosition 
                } 
              : f
          )
        );
        setIsAnimating(false);
      }
    };
    
    // Iniciar la animación
    animateStep();
  };

  const rollDice = () => {
    if (gameId && !isAnimating) {
      sendMessage(JSON.stringify({ Action: "MakeMove", GameId: gameId }));
      sendMessage(JSON.stringify({ Action: "GetGame", GameId: gameId }));
    }
  };

  const createGame = () => {
    sendMessage(JSON.stringify({ Action: "CreateGame" }));
  };

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col items-center p-4">
      <div className="text-white/80 text-sm mb-4">
        ID Sala: {gameId || "Sin partida"}
      </div>
      
      <div className="mb-4 w-full max-w-4xl">
        <Tablero fichas={fichas} />
      </div>
      
      <div className="flex gap-4 mt-4">
        <Button 
          onClick={createGame} 
          disabled={!!gameId || isAnimating}
          className="bg-green-600 hover:bg-green-700"
        >
          Crear Partida
        </Button>
        
        <Button 
          onClick={rollDice} 
          disabled={!gameId || isAnimating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Tirar Dado
        </Button>
      </div>
      
      {isAnimating && (
        <div className="mt-4 text-amber-400 font-medium">
          Moviendo ficha...
        </div>
      )}
    </div>
  );
}