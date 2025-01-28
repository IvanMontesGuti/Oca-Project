"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { FRIENDSHIP_GET_ALL_URL, API_SEARCH_URL, FRIENDSHIP_GET_BY_ID_URL } from "@/lib/endpoints/config"

interface Friend {
  id: string
  name: string
  status: string
  avatar?: string
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
          className={`px-3 py-2 rounded-lg text-sm font-medium ${page - 1 === currentPage ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
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
  const [friends, setFriends] = useState<Friend[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFriends = useCallback(async (page = 0, search = "") => {
    setIsLoading(true)
    setError(null)

    try {
      let url
      if (search.trim() === "") {
        url = `${FRIENDSHIP_GET_BY_ID_URL()}?page=${page + 1}&limit=10`
      } else {
        url = `${API_SEARCH_URL}?page=${page + 1}&limit=10&search=${search}`
      }

      const response = await fetch(url)

      if (!response.ok) {
        const errorMessage = await response.text()
        throw new Error(`Failed to fetch friends: ${errorMessage}`)
      }

      const data = await response.json()
      console.log(data)
      setFriends(data.users || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error("Error fetching friends:", error)
      setError("Failed to load friends. Please try again later.")
      setFriends([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFriends(currentPage, searchQuery)
  }, [currentPage, searchQuery, fetchFriends])

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
          placeholder="Search by nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        {isLoading ? (
          <div className="text-white text-center">Loading...</div>
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : friends.length === 0 ? (
          <div className="text-white text-center">No friends found</div>
        ) : (
          <div className="space-y-4">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                    <AvatarFallback>{friend.name ? friend.name.slice(0, 2).toUpperCase() : "NA"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium leading-none text-white">{friend.name}</div>
                    <div className="text-sm text-gray-400">{friend.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && !error && friends.length > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageClick} />
        )}
      </div>
    </div>
  )
}

