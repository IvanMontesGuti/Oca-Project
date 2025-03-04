import Image from "next/image";
import Link from "next/link";
import { ArrowRight, User, LogOut, Edit, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, GET_USER_BY_ID_URL } from "@/lib/endpoints/config";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

export function Header2() {
  const { userInfo, logout, userId } = useAuth();
  const { family_name, unique_name } = userInfo || {};
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchUserRole = async () => {
    if (!userId) return;
    try {
      const response = await fetch(GET_USER_BY_ID_URL(userId), {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("⚠️ Error al obtener el rol del usuario");

      const data = await response.json();
      setUserRole(data.role);
    } catch (error) {
      console.error("❌ Error obteniendo rol del usuario:", error);
    }
  };

  useEffect(() => {
    fetchUserRole();
  }, [userId]);
  
  useEffect(() => {
    if(userRole === "bloqueado") logout()
  }, [userRole]);

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada correctamente");
  };

  return (
    <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Image src="/images/logo.svg" alt="logo" width={50} height={50} />
        <span className="text-white text-2xl font-fredoka flex items-center gap-2">
          OcaGo! <ArrowRight className="h-5 w-5" />
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-center">
              <p className="text-white text-center">{unique_name}</p>
              <Avatar className="w-14 h-14 border border-gray-300 hover:border-white transition-colors">
                <AvatarImage
                  src={family_name ? `${API_BASE_URL}/${family_name}` : undefined}
                  alt="Avatar"
                />
                <AvatarFallback className="bg-gray-500 text-white">
                  {unique_name?.slice(0, 1).toUpperCase() || "NA"}
                </AvatarFallback>
              </Avatar>
            </div>
          </Button>
        </DropdownMenuTrigger>



        <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuItem asChild>
            <Link href={`/profile/${unique_name}`} className="cursor-pointer flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Mi Perfil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href={`/profile/`} className="cursor-pointer flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Editar Perfil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/menu" className="cursor-pointer flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              <span>Menu</span>
            </Link>
          </DropdownMenuItem>

          {userRole === "admin" && (
            <DropdownMenuItem asChild>
              <Link
                href="/admin"
                className="cursor-pointer flex items-center gap-2 text-yellow-500"
              >
                <Settings className="h-4 w-4" />
                <span>Panel de Administrador</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>


        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
