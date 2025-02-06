import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface UserSearchProps {
  onSearch: (query: string) => void
}

export default function UserSearch({ onSearch }: UserSearchProps) {
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2 mb-4">
      <Input type="text" placeholder="Buscar por nickname" value={query} onChange={(e) => setQuery(e.target.value)} />
      <Button type="submit">Buscar</Button>
    </form>
  )
}

