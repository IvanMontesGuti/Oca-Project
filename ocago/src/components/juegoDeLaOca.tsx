"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Tablero from "./tablero"
import { isOca, isEspecial, special, oca, lanzarDado } from "../utils/ocalogic"

interface Player {
  position: number
  turnosRestantes: number
}

const JuegoDeLaOca: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([
    { position: 0, turnosRestantes: 1 },
    { position: 0, turnosRestantes: 1 },
  ])
  const [currentPlayer, setCurrentPlayer] = useState<number>(0)
  const [turnNumber, setTurnNumber] = useState<number>(1)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")

  const jugarTurno = () => {
    if (gameOver) return

    const newPlayers = [...players]
    const player = newPlayers[currentPlayer]

    const dado = lanzarDado()
    let newPosition = player.position + dado
    setMessage(`Jugador ${currentPlayer + 1} ha sacado un ${dado} y avanza a la casilla ${newPosition}`)

    if (newPosition > 63) {
      newPosition = 63 - (newPosition - 63)
    }

    if (isOca(newPosition)) {
      setMessage((prevMessage) => `${prevMessage}. ¡De oca a oca y tiro porque me toca!`)
      newPosition = oca(newPosition)
      player.turnosRestantes++
    } else if (isEspecial(newPosition)) {
      setMessage((prevMessage) => `${prevMessage}. ¡Casilla especial!`)
      const [nuevaPosicion, nuevosTurnos] = special(newPosition)
      newPosition = nuevaPosicion
      if (nuevosTurnos < 0) {
        newPlayers[1 - currentPlayer].turnosRestantes += Math.abs(nuevosTurnos)
        setMessage(
          (prevMessage) =>
            `${prevMessage}. El jugador ${2 - currentPlayer} gana ${Math.abs(nuevosTurnos)} turnos adicionales.`,
        )
      } else {
        player.turnosRestantes += nuevosTurnos
      }
      if (nuevosTurnos === 0) {
        player.turnosRestantes = 0
      }
    }

    player.position = newPosition
    player.turnosRestantes--

    if (newPosition === 63) {
      setGameOver(true)
      setMessage(`¡El jugador ${currentPlayer + 1} ha ganado!`)
    } else if (player.turnosRestantes <= 0) {
      setCurrentPlayer(1 - currentPlayer)
      setTurnNumber((prevTurn) => prevTurn + 1)
    }

    setPlayers(newPlayers)
  }

  useEffect(() => {
    if (players.every((player) => player.turnosRestantes <= 0)) {
      setPlayers(players.map((player) => ({ ...player, turnosRestantes: 1 })))
    }
  }, [players])

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Juego de la Oca</h1>
      <div className="mb-4">
        <p>Turno: {turnNumber}</p>
        <p>Jugador actual: {currentPlayer + 1}</p>
        <p>Posición Jugador 1: {players[0].position}</p>
        <p>Posición Jugador 2: {players[1].position}</p>
      </div>
      <button
        onClick={jugarTurno}
        disabled={gameOver}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        Lanzar Dado
      </button>
      <p className="mb-4">{message}</p>
      <Tablero
        fichas={players.map((player, index) => ({
          casillaX: player.position % 12,
          casillaY: Math.floor(player.position / 12),
          color: index === 0 ? "red" : "blue",
        }))}
      />
    </div>
  )
}

export default JuegoDeLaOca

