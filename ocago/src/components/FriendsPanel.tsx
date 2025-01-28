"use client"

import { useState, useEffect, useCallback } from "react"
import { jwtDecode } from "jwt-decode"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL, API_BASE_URL} from "@/lib/endpoints/config"

interface User {
  id: number
  mail: string
  nickname: string
  avatarUrl: string
  status: number
}

interface Friend extends User {
  friends: User[]
  sentFriendships: any[]
  receivedFriendships: any[]
}

interface DecodedToken {
  id: number
}

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-center mt-6 gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Anterior
      </button>

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page - 1)}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            page - 1 === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Siguiente →
      </button>
    </div>
  )
}

export default function FriendsPanel() {
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken")
      if (token) {
        try {
          const decodedToken = jwtDecode<DecodedToken>(token)
          setUserInfo(decodedToken)
        } catch (error) {
          console.error("Error al decodificar el token:", error)
        }
      }
    }
  }, [])

  const fetchFriends = useCallback(
    async (page = 0, search = "") => {
      setIsLoading(true)
      setError(null)

      if (!userInfo?.id) {
        setError("No se pudo obtener la información del usuario")
        setIsLoading(false)
        return
      }

      try {
        let url = ""
        if (search.trim().length <= 1) {
          url = `${FRIENDSHIP_GET_BY_ID_URL(userInfo.id)}?page=${page + 1}&limit=10`
        } else {
          url = `${API_SEARCH_URL}?query=${search}`
        }

        const response = await fetch(url)
        console.log("URL de la solicitud:", url)

        if (!response.ok) {
          if (response.status === 404) {
            // No users found
            setFriends([])
            setTotalPages(1)
            return
          }
          const errorMessage = await response.text()
          throw new Error(`Error al obtener amigos: ${errorMessage}`)
        }

        const data = await response.json()
        console.log("Datos recibidos:", data)

        if (search.trim().length <= 1) {
          setFriends(data.friends || [])
          setTotalPages(data.totalPages || 1)
        } else {
          setFriends(data)
          setTotalPages(1)
        }
      } catch (error) {
        console.error("Error fetching friends:", error)
        setError("Hubo un error al cargar los amigos. Por favor, inténtalo más tarde.")
        setFriends([])
      } finally {
        setIsLoading(false)
      }
    },
    [userInfo?.id],
  )

  useEffect(() => {
    if (userInfo?.id) {
      fetchFriends(currentPage, searchQuery)
    }
  }, [currentPage, searchQuery, fetchFriends, userInfo?.id])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(0)
  }

  const handlePageClick = (selected: number) => {
    setCurrentPage(selected)
  }

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Amigos</h2>
          <button className="text-sm text-gray-400 hover:text-white">Ver todos</button>
        </div>
        <Input
          type="text"
          placeholder="Buscar por nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        {isLoading ? (
          <div className="text-white text-center">Cargando...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : friends.length === 0 ? (
          <div className="text-white text-center">
            {searchQuery.trim().length > 1
              ? "No se encontraron usuarios que coincidan con la búsqueda."
              : "No tienes amigos aún."}
          </div>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={API_BASE_URL+"/"+friend.avatarUrl || "/placeholder.svg"} alt={friend.nickname} />
                    <AvatarFallback>
                      {friend.nickname ? friend.nickname.slice(0, 2).toUpperCase() : "NA"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-none text-white">{friend.nickname}</div>
                    <div className="text-sm text-gray-400">{friend.status === 0 ? "Offline" : "Online"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && !error && friends.length > 0 && searchQuery.trim().length <= 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageClick} />
        )}
      </div>
    </div>
  )
}

