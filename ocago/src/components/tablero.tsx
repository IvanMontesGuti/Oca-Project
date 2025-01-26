"use client"

import type React from "react"

interface Ficha {
  casillaX: number
  casillaY: number
  color: string
}

interface TableroProps {
  fichas: Ficha[]
}

const Tablero: React.FC<TableroProps> = ({ fichas }) => {
  const numCasillasAncho = 12
  const numCasillasAlto = 8
  const anchoCasilla = 96
  const altoCasilla = 108

  return (
    <svg
      width={anchoCasilla * numCasillasAncho}
      height={altoCasilla * numCasillasAlto}
      className="border border-gray-300 shadow-lg"
    >
      <image
        href="/images/tablero.svg"
        x={0}
        y={0}
        width={anchoCasilla * numCasillasAncho}
        height={altoCasilla * numCasillasAlto}
        preserveAspectRatio="xMidYMid slice"
      />

      {Array.from({ length: numCasillasAlto }).map((_, fila) =>
        Array.from({ length: numCasillasAncho }).map((_, columna) => (
          <rect
            key={`casilla-${fila}-${columna}`}
            x={columna * anchoCasilla}
            y={fila * altoCasilla}
            width={anchoCasilla}
            height={altoCasilla}
            fill="transparent"
            stroke="gray"
            strokeWidth="1"
            className="cursor-pointer hover:fill-gray-200 hover:fill-opacity-30 transition-colors duration-200"
          />
        )),
      )}

      {fichas.map((ficha, index) => {
        const x = ficha.casillaX * anchoCasilla + anchoCasilla / 2
        const y = ficha.casillaY * altoCasilla + altoCasilla / 2

        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={20}
            fill={ficha.color}
            className="cursor-pointer hover:stroke-white hover:stroke-2 transition-all duration-200"
          />
        )
      })}
    </svg>
  )
}

export default Tablero

