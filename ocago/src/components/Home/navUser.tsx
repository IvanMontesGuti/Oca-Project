import Image from "next/image"
import Link from "next/link"
import { ArrowRight, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import { API_BASE_URL } from "@/lib/endpoints/config"

interface DecodedToken {
  email: string
  role: string
  unique_name: string
  family_name?: string
  nbf: number
  exp: number
  iat: number
  id: number
}

export function Header2() {
  const { userInfo, logout } = useAuth()

  const { unique_name, family_name } = userInfo || {}
  
  const handleLogout = () => {
    logout()
    toast.success("Sesión cerrada correctamente")
  }

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
              <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-300 hover:border-white transition-colors">
                <img src={`${API_BASE_URL}/${family_name}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Mi Perfil</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/menu" className="cursor-pointer flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              <span>Menu</span>
            </Link>
          </DropdownMenuItem>

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
  )
}

