import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Download } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0066FF]">
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full" />
          <span className="text-white text-2xl font-fredoka flex items-center gap-2">
            OcaGo! <ArrowRight className="h-5 w-5" />
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Inicia Sesion
          </Link>
          <Link
            href="/register"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Registrate
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 md:py-14 flex flex-col md:flex-row items-center justify-between">
        <div className="md:w-1/2 space-y-3">
          <h1 className="text-5xl md:text-7xl font-fredoka font-bold">
            <span className="text-[#FFFF00]">CLÁSICO,</span>
            <br />
            <span className="text-white">REAL-TIME,</span>
            <br />
            <span className="text-white">DIVERTIDO.</span>
          </h1>
          <p className="text-white text-xl font-montserrat">
            El juego clásico de la oca, con amigos.
          </p>
          <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-white/30 transition-colors font-montserrat">
            Enseñame a jugar
            <Download className="h-5 w-5" />
          </button>
        </div>
        <div className="md:w-1/2 mt-12 md:mt-0 relative">
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
    </div>
  )
}

