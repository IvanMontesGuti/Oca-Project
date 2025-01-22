"use client"

import { Preguntas } from '@/components/preguntas'
import { Header } from '@/components/header'
import { InfoPage } from '@/components/infoPage'

export default function Home() {
    return (
      <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
      <Header/>
      <InfoPage/>
      <Preguntas/>
      </div>

      
    
  )
}

