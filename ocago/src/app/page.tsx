"use client"

import { Preguntas } from '@/components/preguntas'
import { Header } from '@/components/header'
import { Header2 } from '@/components/navUser' 
import { InfoPage } from '@/components/infoPage'
import { jwtDecode } from "jwt-decode"
import { useEffect, useState } from 'react'

export default function Home() {
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);

  useEffect(() => {
      if (typeof window !== "undefined") {
          const token = localStorage.getItem("authToken");
          
          if (token) {
              try {
                  const decodedToken = jwtDecode<DecodedToken>(token);
                  setUserInfo(decodedToken);
                  
              } catch (error) {
                  console.error("Error al decodificar el token:", error);
              }
          }
      }
  }, []);

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      {userInfo ? <Header2 /> : <Header />}
      <InfoPage />
      <Preguntas />
    </div>
  )
}
