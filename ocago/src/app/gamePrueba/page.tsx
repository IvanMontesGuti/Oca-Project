"use client"

import { useState, useEffect } from "react";
import useWebSocket from "react-use-websocket";
import { Button } from "@/components/ui/button";
import Tablero from "@/components/tablero";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { set } from "lodash";

interface DecodedToken {
  email: string;
  role: string;
  unique_name: string;
  family_name?: string; 
  nbf: number;
  exp: number;
  iat: number;
  id: number;
}

export default function GameBoard() {
  const {userInfo} = useAuth();
  
  
  const { family_name, unique_name} = userInfo || {};
  const userId = userInfo?.unique_name.toString();

  const wsUrl = `wss://localhost:7107/ws/game/${userId}/connect`;
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [remainingTurns, setRemainingTurns] = useState<Record<string, number>>({});
  const [winner, setWinner] = useState<string | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  
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
          
          if (data.IsPlayer1Turn ===true){
            setCurrentTurn(data.data.Player2Id);
          }else{
            setCurrentTurn(data.data.Player1Id);
          }
          // Actualizar turnos restantes
          const turnsRemaining: Record<string, number> = {};
          if (data.data.Player1Id) {
            turnsRemaining[data.data.Player1Id] = data.data.Player1RemainingTurns;
          }
          if (data.data.Player2Id) {
            turnsRemaining[data.data.Player2Id] = data.data.Player2RemainingTurns;
          }
          setRemainingTurns(turnsRemaining);
          
          // Verificar si hay un ganador
          if (data.data.WinnerId) {
            setWinner(data.data.WinnerId);
            setGameStats({
              winnerId: data.data.WinnerId,
              totalMoves: data.data.TotalMoves || 0,
              gameTime: data.data.GameTime || 0,
              player1Moves: data.data.Player1Moves || 0,
              player2Moves: data.data.Player2Moves || 0
            });
            setShowWinModal(true);
          }
        } else if (data.action === "moveUpdate") {
          // Actualizar el valor del dado
          if (data.data.DiceValue) {
            console.log("🎲 Dado recibido:", data.data.DiceValue);
            animateDiceRoll(data.data.DiceValue);
          }
          
          
          // Después de que termine la animación del dado, mover la ficha
          setTimeout(() => {
            animateMovement(data.data.PlayerId, data.data.NewPosition);
          
            // Actualizar el turno actual después del movimiento
            
            
            
            // Actualizar turnos restantes si están disponibles
            if (data.data.PlayerId && data.data.RemainingTurns !== undefined) {
              setRemainingTurns(prevTurns => ({
                ...prevTurns,
                [data.data.PlayerId]: data.data.RemainingTurns
              }));
            }
          }, 1500); // Tiempo para la animación del dado
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
    CurrentTurnPlayerId: string;
    Player1RemainingTurns: number;
    Player2RemainingTurns: number;
    WinnerId?: string;
    TotalMoves?: number;
    GameTime?: number;
    Player1Moves?: number;
    Player2Moves?: number;
  }

  interface GameStats {
    winnerId: string;
    totalMoves: number;
    gameTime: number;
    player1Moves: number;
    player2Moves: number;
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

  const animateDiceRoll = (finalValue: number) => {
    setIsDiceRolling(true);
    
    // Simulamos la animación del dado cambiando rápidamente su valor
    let count = 0;
    const intervalTime = 100; // 100ms entre cambios
    const totalTime = 1500; // 1.5 segundos en total
    const totalSteps = totalTime / intervalTime;
    
    const diceInterval = setInterval(() => {
      // Valores aleatorios mientras gira
      if (count < totalSteps - 1) {
        setDiceValue(Math.floor(Math.random() * 6) + 1);
      } else {
        // Valor final
        setDiceValue(finalValue);
        clearInterval(diceInterval);
        setIsDiceRolling(false);
      }
      count++;
    }, intervalTime);
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
    if (gameId && !isAnimating && !isDiceRolling) {
      sendMessage(JSON.stringify({ Action: "MakeMove", GameId: gameId }));
    }
  };

  const createGame = () => {
    sendMessage(JSON.stringify({ Action: "CreateGame" }));
  };

  const resetGame = () => {
    setShowWinModal(false);
    setWinner(null);
    setGameStats(null);
    setGameId(null);
    setFichas([]);
    setDiceValue(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // Determinar el color del jugador
  const getPlayerColor = (playerId: string): string => {
    const ficha = fichas.find(f => f.playerId === playerId);
    return ficha?.color || "gray";
  };

  // Renderizar cara del dado según el valor
  const renderDiceFace = (value: number | null) => {
    if (value === null) return null;
    
    const dots = [];
    
    // Configuración de puntos según el valor del dado
    switch (value) {
      case 1:
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>);
        break;
      case 2:
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        break;
      case 3:
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        break;
      case 4:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        break;
      case 5:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="center" className="absolute inset-0 m-auto w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        break;
      case 6:
        dots.push(<div key="top-left" className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="top-right" className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="middle-left" className="absolute top-1/2 -translate-y-1/2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="middle-right" className="absolute top-1/2 -translate-y-1/2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-left" className="absolute bottom-2 left-2 w-2 h-2 bg-black rounded-full"></div>);
        dots.push(<div key="bottom-right" className="absolute bottom-2 right-2 w-2 h-2 bg-black rounded-full"></div>);
        break;
      default:
        break;
    }
    
    return (
      <div className={`relative w-16 h-16 bg-white rounded-lg shadow-lg ${isDiceRolling ? 'animate-bounce' : ''}`}>
        {dots}
      </div>
    );
  };

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col items-center p-4">
      <div className="text-white/80 text-sm mb-4">
        ID Partida: {gameId || "Sin partida"}
      </div>
      
      {gameId && (
        <div className="bg-black/50 p-3 rounded-lg mb-4 w-full max-w-4xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {currentTurn && (
                <>
                  <div 
                    className={`w-4 h-4 rounded-full ${currentTurn === userId ? 'animate-pulse' : ''}`} 
                    style={{ backgroundColor: getPlayerColor(currentTurn) }}
                  ></div>
                  <div className="text-white font-medium">
                    Turno de: {currentTurn}
                    {currentTurn === userId && " (Tu turno)"}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-6">
              {Object.entries(remainingTurns).map(([playerId, turns]) => (
                <div key={playerId} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getPlayerColor(playerId) }}
                  ></div>
                  <div className="text-white/80 text-sm">
                    {playerId}: {turns} turnos paralizado
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 w-full max-w-4xl relative">
        <Tablero fichas={fichas} />
        
        {/* Piezas animadas */}
        {fichas.map((ficha) => (
          <div
            key={ficha.playerId}
            className={`absolute w-6 h-6 rounded-full transition-all duration-300 ease-in-out ${isAnimating ? 'animate-bounce' : ''}`}
            style={{
              backgroundColor: ficha.color,
              left: `calc(${ficha.casillaX / 11 * 100}% - 12px)`,
              top: `calc(${ficha.casillaY / 7 * 100}% - 12px)`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: 10,
              transform: 'translate(0, 0)',
              border: '2px solid white'
            }}
          ></div>
        ))}
      </div>
      
      {/* Dado */}
      {diceValue !== null && (
        <div className="mb-6 flex flex-col items-center">
          <div className="text-white text-sm mb-2">Resultado:</div>
          <div className={`transform ${isDiceRolling ? 'animate-spin' : ''}`}>
            {renderDiceFace(diceValue)}
          </div>
        </div>
      )}
      
      <div className="flex gap-4 mt-4">
        <Button 
          onClick={createGame} 
          disabled={!!gameId || isAnimating || isDiceRolling}
          className="bg-green-600 hover:bg-green-700"
        >
          Crear Partida
        </Button>
        
        <Button 
          onClick={rollDice} 
          disabled={!gameId || isAnimating || isDiceRolling || currentTurn !== userId}
          className={`bg-blue-600 hover:bg-blue-700 ${currentTurn === userId ? 'animate-pulse' : ''}`}
        >
          {isDiceRolling ? 'Lanzando...' : 'Tirar Dado'}
        </Button>
        
      </div>
      
      {isAnimating && (
        <div className="mt-4 text-amber-400 font-medium animate-pulse">
          Moviendo ficha...
        </div>
      )}

      {/* Modal de Victoria */}
      <Dialog open={showWinModal} onOpenChange={setShowWinModal}>
        <DialogContent className="sm:max-w-md bg-slate-800 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl text-center">
              <span className="text-amber-400 text-2xl animate-bounce inline-block">¡Victoria!</span>
            </DialogTitle>
            <DialogDescription className="text-center text-white/80">
              El jugador <span className="font-bold text-white" style={{ color: getPlayerColor(winner || "") }}>{winner}</span> ha ganado la partida
            </DialogDescription>
          </DialogHeader>
          
          {gameStats && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-sm text-slate-400">Movimientos Totales</div>
                  <div className="text-xl font-bold">{gameStats.totalMoves}</div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <div className="text-sm text-slate-400">Tiempo de Juego</div>
                  <div className="text-xl font-bold">{formatTime(gameStats.gameTime)}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm text-slate-400">Estadísticas por Jugador</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: "red" }}
                    ></div>
                    <div className="text-sm">Jugador 1: {gameStats.player1Moves} movimientos</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: "blue" }}
                    ></div>
                    <div className="text-sm">Jugador 2: {gameStats.player2Moves} movimientos</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={resetGame} 
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              Nueva Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}