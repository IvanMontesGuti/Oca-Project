import type { NextPage } from "next"
import Head from "next/head"
import JuegoDeLaOca from "@/components/juegoDeLaOca"

const tablero: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <Head>
        <title>Juego de la Oca</title>
        <meta name="description" content="A digital version of Juego de la Oca" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4">
        <JuegoDeLaOca />
      </main>
    </div>
  )
}

export default tablero

