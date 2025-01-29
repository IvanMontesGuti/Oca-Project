import React, { useEffect, useState } from 'react';
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from 'sonner';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    email: string;
    role: string;
    unique_name: string;
    family_name?: string; 
    nbf: number;
    exp: number;
    iat: number;
    id: number;
}

export function Header2() {
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
      </>
  );
}
