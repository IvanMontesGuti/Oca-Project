"use client"
//MENU
import {} from "react"
//import { jwtDecode } from "jwt-decode";
import Link from "next/link"
import Image from "next/image"
import { Toaster } from "sonner"
//import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import FriendsPanel from "@/components/Friends/FriendsPanel"
import { WebInfo } from "@/components/Home/WebInfo"
//import { UPDATE_USER_STATE } from "@/lib/endpoints/config";
//import { FETCH_PUT } from "@/lib/endpoints/useFetch";
import { Header2 } from "@/components/Home/navUser"
import { useAuth } from "@/context/AuthContext"
import { Header } from "@/components/header"
import RecentMatches from "@/components/Game/RecentMatches"
import ProtectedRoute from "@/components/ProtectedRoute/page"

/*
interface DecodedToken {
  email: string;
  role: string;
  unique_name: string;
  family_name?: string;
  nbf: number;
  exp: number;
  iat: number;
  id: number;
}*/

export default function OcaGame() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <p className="text-2xl font-semibold text-red-600 mb-6 font-fredoka">¡Inicia sesión para poder entrar!</p>
          <Link href="/" className="text-lg text-blue-600 hover:text-blue-500 transition-colors font-montserrat">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
    <ProtectedRoute>
      <div className="min-h-screen bg-[#2E1B6B] text-white">
        {isAuthenticated ? <Header2 /> : <Header />}
        <Toaster />
        <div className="container mx-auto px-4 py-8 ">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2">
              <div className="relative w-full">
                <Image
                  src="/images/tablero.svg"
                  alt="OcaGo game board"
                  width={600}
                  height={400}
                  className="animate-float w-full h-auto rounded-lg"
                  priority
                />
              </div>

              {/* Recent Matches Section */}
              <div className="mt-6">
                <RecentMatches />
              </div>
            </div>

            <div className="lg:w-1/3 flex flex-col justify-center gap-8">
              <div className="flex flex-col items-center lg:items-start gap-4">
                <div className="w-24 h-24 items-center">
                  <Image
                    src="/images/logo.svg"
                    alt="OcaGo logo"
                    width={96}
                    height={96}
                    className="rounded-full bg-white p-2"
                  />
                </div>
                <div className="text-center lg:text-left">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2 items-center">
                    Juega al juego clásico de la oca con amigos <span className="text-[#4ADE80]">online</span>.
                  </h1>
                  <WebInfo />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  href="/gamePrueba"
                  className="bg-[#E633FF] hover:bg-[#D020E9] text-white px-8 rounded-lg font-fredoka"
                >
                  Play Online
                </Link>
                <Link
                  href="/gameBot"
                  className="bg-[#33FFE6] hover:bg-[#20E9D0] text-black px-8 rounded-lg font-fredoka"
                >
                  Play Bot
                </Link>
              </div>
            </div>

            <FriendsPanel />
          </div>
        </div>
      </div>
      </ProtectedRoute>
    </>
  )
}

