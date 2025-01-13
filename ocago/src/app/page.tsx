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
    <div className="bg-svg bg-cover bg-no-repeat h-full min-h-screen w-full flex flex-col">
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
            href="#faq"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Preguntas frecuentes
          </Link>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Inicia Sesión
          </button>
          <Link
            href="/register"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Regístrate
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-12 py-5 md:py-1 flex flex-col md:flex-row items-center justify-between flex-grow">
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
            <div className="marquee relative w-[80%] h-[80%]">
              <Image
                
                src="/images/tablero.svg"
                alt="Game Board"
                layout="fill"
                objectFit="contain"
                className="animate-float"
                
              />
              <div className="absolute -top-12 -right-2 z-20">
                <Image
                  src="/images/dice.webp"
                  alt="Dice"
                  width={420}
                  height={420}
                  className="animate-float"
                />
              </div>
            </div>
          </div>
        </div>
        <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      </main>

      <div className="mt-auto m-right-8 mb-8 md:-right-16 w-full md:w-1/2 mx-auto text-white hover:text-gray-200 transition-colors font-montserrat">
        <h1 className='text-3xl	font-size: 1.875rem'>Preguntas Frecuentes</h1>
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

      
    </div>
  )
}

