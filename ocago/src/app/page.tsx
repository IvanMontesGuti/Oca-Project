"use client"


import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import dynamic from 'next/dynamic'

const Modal = dynamic(() => import('@/components/modal').then(mod => mod.Modal), { ssr: false })

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0066FF] flex flex-col overflow-hidden">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2 ">
          <div className="w-12 h-12 bg-gray-100 rounded-full" />
          <span className="text-white text-2xl font-fredoka flex items-center gap-2">
            OcaGo! <ArrowRight className="h-5 w-5" />
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            href="#faq"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Preguntas frecuentes
          </Link>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Inicia Sesion
          </button>
          <Link
            href="/register"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Registrate
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 md:py-1 flex flex-col md:flex-row items-center justify-between flex-grow">
        <div className="md:w-1/2 space-y-4">
          <h1 className="text-8xl md:text-8xl font-fredoka font-bold ">
            <span className="text-[#FFFF00]">CLÁSICO,</span>
            <br />
            <span className="text-white">REAL-TIME,</span>
            <br />
            <span className="text-white tracking-wide">ENTRETENIDO.</span>
          </h1>
          <p className="text-white text-xl font-montserrat">
            El juego clásico de la oca, con amigos.
          </p>
          
          <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors font-montserrat">
            Empezar a jugar
            <ArrowRight className="h-5 w-5"/>
          </button>
        </div>
        
        <div className="md:w-1/2 mt-8 md:mt-0 relative">
          <div className="relative w-full aspect-square flex justify-end items-center">
            <div className="relative w-[80%] h-[80%]">
              <Image
                src="/images/table.webp"
                alt="Game Board"
                layout="fill"
                objectFit="contain"
                className="z-10"
              />
              <div className="absolute -top-2 -right-8 z-20">
                <Image
                  src="/images/dados.webp"
                  alt="Dice"
                  width={420}
                  height={420}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="mt-auto m-right-8 mb-8 md:-right-16 w-full md:w-1/2 mx-auto text-white hover:text-gray-200 transition-colors font-montserrat">
        <h1>Preguntas Frecuentes</h1>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger id="faq">¿Como se juega?</AccordionTrigger>
            <AccordionContent>
              El juego de la Oca es un juego de mesa tradicional español muy popular. Se juega en un tablero con un recorrido de casillas numeradas, y el objetivo es llegar al final del recorrido antes que los demás jugadores.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger id="faq">Objetivo del juego</AccordionTrigger>
            <AccordionContent>
            El objetivo es llegar a la casilla número 63 antes que los demás jugadores.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger id="faq">Jugadores</AccordionTrigger>
            <AccordionContent>
            Puede jugar de 2 a 6 jugadores. Aunque en esta versión online, el número de jugadores es únicamente de 2.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger id="faq">Desarrollo del juego</AccordionTrigger>
            <AccordionContent>
            En cada turno, el jugador tira un dado y avanza el número de casillas que indique. Algunas casillas tienen efectos especiales.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger id="faq">Reglas especiales</AccordionTrigger>
            <AccordionContent>
            Si un jugador cae en una casilla ocupada por otro, debe retroceder hasta una casilla anterior.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  )
}

