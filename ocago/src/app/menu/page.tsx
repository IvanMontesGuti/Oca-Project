"use client";

import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Image from "next/image"
import { Toaster, toast } from 'sonner'
import { Button } from "@/components/ui/button"


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
interface DecodedToken {
    email: string;
    role: string;
    unique_name: string;
    family_name?: string; 
    nbf: number;
    exp: number;
    iat: number;
}
export default function OcaGame() {
  
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);

  useEffect(() => {
          if (typeof window !== "undefined") {
              const token = localStorage.getItem("authToken");
              
              if (token) {
                  try {
                      const decodedToken = jwtDecode<DecodedToken>(token);
                      setUserInfo(decodedToken);
                      setTimeout(() => {
                        toast.success('Sesión iniciada correctamente.')
                      }, 100)
                  } catch (error) {
                      console.error("Error al decodificar el token:", error);
                  }
              }
          }
      }, []);

      if (!userInfo) {
        return (
          <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <p className="text-2xl font-semibold text-red-600 mb-6 font-fredoka">
              ¡Inicia sesión para poder entrar!
            </p>
            <Link
              href="/"
              className="text-lg text-blue-600 hover:text-blue-500 transition-colors font-montserrat"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
        );
    }

  const { family_name, unique_name} = userInfo;

  return (
    <>
    
    <div className="min-h-screen bg-[#2E1B6B] text-white">
    
    <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
      
        <div className="flex items-center gap-2 ">
        <Image
                  src="/images/logo.svg"
                  alt="logo"
                  width={50}
                  height={50}
                  
                />
          <span className="text-white text-2xl font-fredoka flex items-center gap-2">
            OcaGo! <ArrowRight className="h-5 w-5" />
          </span>
        </div>
        <div className="flex gap-4">
        
          <Link
            href="/dashboard"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            <div className="flex flex-col lg:flex-row gap-8 items-center justify-center">
            <p className="text-white text-center mb-2">
                    {unique_name}
                    
            </p>
            <p><img
                        src={"https://localhost:7107/" + family_name}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full mx-auto mb-4 border border-gray-300"
                    /></p>
            </div>
          </Link>
          
        </div>
      </nav>
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
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span>
                    <strong className="text-white">?</strong> Personas conectadas
                  </span>
                  <span>
                    <strong className="text-white">?</strong> Personas en partida
                  </span>
                  <span>
                    <strong className="text-white">?</strong> Partidas activas
                  </span>
                </div>
              </div>
            </div>

           
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-[#E633FF] hover:bg-[#D020E9] text-white px-8">
                Play Online
              </Button>
              <Button size="lg" className="bg-[#33FFE6] hover:bg-[#20E9D0] text-black px-8">
                Play Bot
              </Button>
            </div>
          </div>

          
          <div className="hidden lg:block lg:w-1/6">
            <div className="bg-[#231356] rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold">Friends</h2>
                <button className="text-sm text-gray-400 hover:text-white">view all</button>
              </div>
              <div className="text-sm text-gray-400 mb-4">Buscar por nickname...</div>
              
                <div className="space-y-4">
                  {["JoseA3928b4", "RamonGamer", "IvanMontes8", "smurf_pedro"].map((name) => (
                    <div key={name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src="/placeholder.svg" />
                          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium leading-none">{name}</div>
                          <div className="text-sm text-gray-400">Connected</div>
                        </div>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlusCircleIcon className="h-5 w-5 text-gray-400 hover:text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

function PlusCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  )
}

