"use client"

import type React from "react"
import { useState } from "react"
import Tablero from "./Tablero"

interface GameState {
  currentPlayer: "red" | "blue"
  redScore: number
  blueScore: number
}

const GameBoard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: "red",
    redScore: 0,
    blueScore: 0,
  })

  const handleMove = (x: number, y: number) => {
    // Update the game state based on the move
    setGameState((prevState) => {
      const newScore = prevState[`${prevState.currentPlayer}Score`] + 1
      return {
        ...prevState,
        [`${prevState.currentPlayer}Score`]: newScore,
        currentPlayer: prevState.currentPlayer === "red" ? "blue" : "red",
      }
    })
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-xl font-semibold">
        Current Player: <span className={`text-${gameState.currentPlayer}-600`}>{gameState.currentPlayer}</span>
      </div>
      <div className="mb-4 text-lg">
        <span className="text-red-600 mr-4">Red Score: {gameState.redScore}</span>
        <span className="text-blue-600">Blue Score: {gameState.blueScore}</span>
      </div>
      <Tablero onMove={handleMove} />
    </div>
  )
}

export default GameBoard

