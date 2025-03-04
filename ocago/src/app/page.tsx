"use client"

import { Preguntas } from '@/components/preguntas'
import { Header } from '@/components/header'
import { Header2 } from '@/components/Home/navUser' 
import { InfoPage } from '@/components/Home/infoPage'

import { useAuth } from "@/context/AuthContext";


export default function Home() {
const {isAuthenticated} = useAuth();

  return (
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      {isAuthenticated ? <Header2 /> : <Header />}
      <InfoPage />
      <Preguntas />
    </div>
  )
}