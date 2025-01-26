'use client'
import type { NextPage } from "next"
import Head from "next/head"
import GameBoard from "../components/GameBoard"

const Tablero: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Head>
        <title>Tablero Game</title>
        <meta name="description" content="A simple board game using the Tablero component" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Tablero Game</h1>
        <GameBoard />
      </main>
    </div>
  )
}

export default Tablero;