import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { FRIENDSHIP_GET_ALL_URL } from "@/lib/endpoints/config";

export default function FriendsPanel() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentPage, setCurrentPage] = useState(0); // Empezamos en 0 para que coincida con los índices de paginación basados en cero
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFriends = async (page = 0, search = "") => {
    try {
      const response = await fetch(
        `${FRIENDSHIP_GET_ALL_URL}?page=${page + 1}&limit=10&search=${search}` // Aumentar page por 1 para que se mantenga el comportamiento correcto de la API
      );
      const data = await response.json();
      setFriends(data.friends);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Error fetching friends:", error);
    }
  };

  useEffect(() => {
    fetchFriends(currentPage, searchQuery);
  }, [currentPage, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(0); // Reinicia a la primera página al buscar
  };

  const handlePageClick = (selected: number) => {
    setCurrentPage(selected); // Pasa la página seleccionada
  };

  return (
    <div className="bg-[#231356] rounded-lg p-4 space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Friends</h2>
        </div>
        <Input
          type="text"
          placeholder="Search by nickname..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-gray-700 text-white placeholder-gray-400"
        />
        <div className="space-y-4">
          {friends.map((friend) => (
            <div key={friend.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage
                    src={friend.avatar || "/placeholder.svg"}
                    alt={friend.name}
                  />
                  <AvatarFallback>
                    {friend.name ? friend.name.slice(0, 2).toUpperCase() : "NA"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium leading-none text-white">
                    {friend.name}
                  </div>
                  <div className="text-sm text-gray-400">{friend.status}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Pagination
          currentPage={currentPage} 
          totalPages={totalPages}
          onPageChange={handlePageClick}
        />
      </div>
    </div>
  );
}
