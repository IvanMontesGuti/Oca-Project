"use client"

import { useState, useEffect } from "react"
import type { User, FriendRequest } from "./types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FriendList from "./FriendList"
import FriendRequests from "./FriendRequests"
import UserSearch from "./UserSearch"

export default function FriendManager() {
  const [friends, setFriends] = useState<User[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])

  useEffect(() => {
    // Simular carga de amigos y solicitudes
    setFriends([
      { id: "1", nickname: "Amigo1", status: 1 },
      { id: "2", nickname: "Amigo2", status: 1 },
    ])
    setFriendRequests([{ id: "req1", from: { id: "3", nickname: "Usuario3", status: 0 } }])
  }, [])

  const handleSearch = (query: string) => {
    // Simular búsqueda de usuarios
    if (query) {
      setSearchResults([
        { id: "4", nickname: "Usuario4", status: 0 },
        { id: "5", nickname: "Usuario5", status: 1 },
      ])
    } else {
      setSearchResults([])
    }
  }

  const sendFriendRequest = (userId: string) => {
    console.log(`Enviando solicitud de amistad a ${userId}`)
    // Aquí iría la lógica para enviar la solicitud
  }

  const acceptFriendRequest = (requestId: string) => {
    console.log(`Aceptando solicitud de amistad ${requestId}`)
    // Simular aceptación de solicitud
    const request = friendRequests.find((req) => req.id === requestId)
    if (request) {
      setFriends([...friends, { ...request.from, status: 1 }])
      setFriendRequests(friendRequests.filter((req) => req.id !== requestId))
    }
  }

  const rejectFriendRequest = (requestId: string) => {
    console.log(`Rechazando solicitud de amistad ${requestId}`)
    setFriendRequests(friendRequests.filter((req) => req.id !== requestId))
  }

  const sendGameInvite = (userId: string) => {
    console.log(`Enviando invitación a partida a ${userId}`)
    // Aquí iría la lógica para enviar la invitación
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Gestión de Amigos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">Amigos</TabsTrigger>
            <TabsTrigger value="requests">Solicitudes</TabsTrigger>
          </TabsList>
          <TabsContent value="friends">
            <UserSearch onSearch={handleSearch} />
            <FriendList
              friends={searchResults.length > 0 ? searchResults : friends}
              onSendRequest={sendFriendRequest}
              onSendInvite={sendGameInvite}
            />
          </TabsContent>
          <TabsContent value="requests">
            <FriendRequests requests={friendRequests} onAccept={acceptFriendRequest} onReject={rejectFriendRequest} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

