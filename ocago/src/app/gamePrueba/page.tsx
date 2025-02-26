"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Dice1Icon as Dice } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { GAME_GET_BY_ID_URL, GAME_MOVE_URL } from "@/lib/endpoints/config"
import useWebSocket, { ReadyState } from "react-use-websocket"

interface GameState {
  currentPlayer: string
  remainingThrows: number
  currentPosition: number
  lastTurn: number
  diceValue: number | null
}

interface ChatMessage {
  player: string
  message: string
  timestamp: string
}

export default function GameBoard() {
  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: "IVAN",
    remainingThrows: 1,
    currentPosition: 22,
    lastTurn: 15,
    diceValue: null,
  })
  const [messageInput, setMessageInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // Replace with your actual WebSocket URL
  const { sendMessage, lastMessage, readyState } = useWebSocket("wss://your-websocket-url.com")

  useEffect(() => {
    const fetchGame = async () => {
      const response = await fetch(GAME_GET_BY_ID_URL("324687324"))
      const data = await response.json()
      setGameState(data)
    }
    fetchGame()
  }, [])

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data)
        if (data.type === "chat") {
          setChatMessages((prev) => [
            ...prev,
            {
              player: data.player,
              message: data.message,
              timestamp: new Date().toLocaleTimeString(),
            },
          ])
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e)
      }
    }
  }, [lastMessage])

  const rollDice = async () => {
    const newDiceValue = Math.floor(Math.random() * 6) + 1
    setGameState((prev) => ({
      ...prev,
      diceValue: newDiceValue,
      remainingThrows: prev.remainingThrows - 1,
    }))

    await fetch(GAME_MOVE_URL("324687324", "IVAN"), {
      method: "POST",
    })
  }

  const handleSendMessage = useCallback(() => {
    if (messageInput.trim() && readyState === ReadyState.OPEN) {
      sendMessage(
        JSON.stringify({
          type: "chat",
          player: gameState.currentPlayer,
          message: messageInput.trim(),
        }),
      )
      setMessageInput("")
    }
  }, [messageInput, readyState, sendMessage, gameState.currentPlayer])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      <div className="text-white/80 text-sm mb-4">
        <div>Id Partida: 324687324</div>
        <div>Id Sala: 23432432</div>
      </div>

      {/* Game Status */}
      <div className="flex justify-center gap-8 text-xl mb-8">
        <div className="text-white">
          TURNO: <span className="text-yellow-300">{gameState.currentPlayer}</span>
        </div>
        <div className="text-white">
          Tiros <span className="text-red-500">Restantes: {gameState.remainingThrows}</span>
        </div>
        <div className="text-white">
          Casilla <span className="text-green-400">actual: {gameState.currentPosition}</span>
        </div>
        <div className="text-white">
          Último turno: <span className="text-white">{gameState.lastTurn}</span>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Chat Section */}
        <div className="w-96">
          <Card className="bg-[#1A1625] text-white p-4">
            <h2 className="text-2xl mb-4">Chat</h2>
            <div className="h-80 bg-[#2A2438] rounded-lg mb-4 p-4 overflow-y-auto flex flex-col gap-2">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    msg.player === gameState.currentPlayer ? "bg-yellow-300/10 ml-auto" : "bg-white/10"
                  } max-w-[80%]`}
                >
                  <div className="text-xs text-yellow-300">{msg.player}</div>
                  <div className="break-words">{msg.message}</div>
                  <div className="text-xs text-white/50 text-right">{msg.timestamp}</div>
                </div>
              ))}
            </div>
            <div className="relative">
              <Textarea
                placeholder="Escribe algo..."
                className="bg-[#2A2438] border-none text-white resize-none pr-12"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                size="icon"
                className="absolute right-2 bottom-2 bg-transparent hover:bg-transparent text-yellow-300 hover:text-yellow-400"
                onClick={handleSendMessage}
                disabled={readyState !== ReadyState.OPEN}
              >
                ↑
              </Button>
            </div>
          </Card>
        </div>

        {/* Game Board */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-4xl min-h-[600px] flex items-center justify-center">
            <Image
              src="images/tablero.svg"
              alt="Tablero de juego"
              width={800}
              height={800}
              className="object-contain"
            />
          </div>
        </div>
      </div>

      {/* Dice Section */}
      <div className="w-96 mt-4">
        <Card className="bg-[#1A1625] p-4">
          <div className="bg-[#0A1625] rounded-lg p-8 flex flex-col items-center justify-center">
            <Dice className="w-24 h-24 text-yellow-300" />
            {gameState.diceValue && (
              <div className="mt-4 text-2xl font-bold text-yellow-300">{gameState.diceValue}</div>
            )}
          </div>
          <Button
            className="w-full mt-4 bg-yellow-300 hover:bg-yellow-400 text-black font-bold text-xl"
            onClick={rollDice}
            disabled={gameState.remainingThrows === 0}
          >
            TIRAR
          </Button>
        </Card>
      </div>
    </div>
  )
}

