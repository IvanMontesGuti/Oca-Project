import React, { } from 'react';
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function InfoPage() {
   
  return (
    <>
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
         
          <Link href="/menu" className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors font-montserrat">
  Empezar a jugar
  <ArrowRight className="h-5 w-5" />
</Link>
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
              <div className="absolute -top-12 -right-2 z--20 ">
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
     
      </main>
      </>
  );
}
