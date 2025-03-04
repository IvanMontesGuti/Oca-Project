"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/lib/endpoints/config";

interface Match {
  id: string;
  player1Id: string;
  player2Id: string | null;
  player1Position: number;
  player2Position: number;
  isPlayer1Turn: boolean;
  player1RemainingTurns: number;
  player2RemainingTurns: number;
  status: number;
  lastUpdated: string;
  winner: string | null;
}

export default function RecentMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userInfo } = useAuth();

  const userId = userInfo?.id;
  const API_GAMES_URL = `${API_BASE_URL}/allMatches/${userId}`;

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(API_GAMES_URL);

        if (!response.ok) {
          throw new Error("No se pudieron cargar las partidas recientes");
        }

        const data: Match[] = await response.json();

        const completedMatches = data.filter((match) => match.status === 2);

        setMatches(completedMatches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        console.error("Error fetching matches:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [API_GAMES_URL]);

  const getPlayerName = (playerId: string | null): string => {
    if (!playerId) return "Bot";
    if (playerId === "{user}") return "Tú";
    return `Jugador ${playerId}`;
  };

  const getWinnerName = (match: Match): string => {
    if (!match.winner) return "Empate";
    if (match.winner === "{user}") return "Tú";

    if (match.winner === match.player1Id) {
      return getPlayerName(match.player1Id);
    } else if (match.winner === match.player2Id) {
      return getPlayerName(match.player2Id);
    }

    return `Jugador ${match.winner}`;
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-white">
        <p className="font-medium">Error: {error}</p>
        <p className="text-sm mt-1 opacity-80">Intenta recargar la página</p>
      </div>
    );
  }

  return (
    <div className="bg-[#3A2683] rounded-lg p-4 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-[#33FFE6] font-fredoka">Partidas Recientes</h2>

      {isLoading ? (
        Array(3)
          .fill(0)
          .map((_, index) => (
            <div key={index} className="mb-3">
              <Skeleton className="h-20 w-full bg-[#4A37A5] rounded-lg" />
            </div>
          ))
      ) : matches.length === 0 ? (
        <p className="text-center py-4 text-gray-300">No hay partidas recientes completadas</p>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {matches.map((match) => (
            <Card key={match.id} className="bg-[#4A37A5] border-none p-3 text-white">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{getPlayerName(match.player1Id)}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-medium">{getPlayerName(match.player2Id)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-300">
                    <CalendarIcon className="w-3 h-3 mr-1" />
                    {new Date(match.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#E633FF]" />
                  <span className="font-medium">{getWinnerName(match)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}