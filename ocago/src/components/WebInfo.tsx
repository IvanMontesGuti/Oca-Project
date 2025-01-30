import { GET_COUNT_STATUS } from "@/lib/endpoints/config"
import React, { useState, useEffect } from "react"

export function WebInfo() {
  const [connectedUsers, setConnectedUsers] = useState<number | null>(null)
  const [usersInGame, setUsersInGame] = useState<number | null>(null)

  const countStatus = async (num: number): Promise<number> => {
    const url = GET_COUNT_STATUS(num)

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const data = await response.json()
      return data || 0
    } catch (error) {
      console.error("Error al realizar la solicitud:", error)
      return 0 
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const connected = await countStatus(1)
      const inGame = await countStatus(2)
      setConnectedUsers(connected + inGame)
      setUsersInGame(inGame)
    }

    fetchData()
  }, []) 

  return (
    <div className="flex items-center gap-4 text-sm text-gray-300">
      <span>
        <strong className="text-white">{connectedUsers}</strong> Personas conectadas
      </span>
      <span>
        <strong className="text-white">{usersInGame}</strong> Personas en partida
      </span>
      <span>
        <strong className="text-white">?</strong> Partidas activas
      </span>
    </div>
  )
}

