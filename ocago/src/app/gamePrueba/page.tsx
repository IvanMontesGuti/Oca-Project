'use client'
import React, { useState } from 'react';

interface Ficha {
  casillaX: number;
  casillaY: number;
  color: string;
}

const Tablero: React.FC = () => {
  const numCasillasAncho = 12;
  const numCasillasAlto = 8;
  const anchoCasilla = 96;  // 99px de ancho por casilla
  const altoCasilla = 108;  // 113px de alto por casilla

  // Inicializar las fichas con coordenadas específicas
  const [fichas, setFichas] = useState<Ficha[]>([
    { casillaX: 4, casillaY: 5, color: 'red' },  // Ficha roja en (2, 3)
    { casillaX: 3, casillaY: 7, color: 'blue' }, // Ficha azul en (5, 6)
  ]);

  // Función para mover una ficha a una nueva coordenada
  const moverFicha = (casillaX: number, casillaY: number, color: string) => {
    setFichas((prevFichas) => {
      return prevFichas.map((ficha) =>
        ficha.color === color // Mover la ficha que coincida con el color
          ? { ...ficha, casillaX, casillaY }
          : ficha
      );
    });
  };

  return (
    <svg
      width={anchoCasilla * numCasillasAncho}
      height={altoCasilla * numCasillasAlto}
      style={{ border: '1px solid black' }}
    >
      {/* Cargar la imagen SVG de fondo */}
      <image
        href="/images/tablero.svg" // Ruta de la imagen SVG
        x={0}
        y={0}
        width={anchoCasilla * numCasillasAncho}
        height={altoCasilla * numCasillasAlto}
        preserveAspectRatio="xMidYMid slice" // Ajusta la imagen para cubrir el área
      />

      {/* Dibujar las casillas */}
      {Array.from({ length: numCasillasAlto }).map((_, fila) =>
        Array.from({ length: numCasillasAncho }).map((_, columna) => (
          <rect
            key={`casilla-${fila}-${columna}`}
            x={columna * anchoCasilla}
            y={fila * altoCasilla}
            width={anchoCasilla}
            height={altoCasilla}
            fill="transparent"
            stroke="gray" // Color del borde de la casilla
            strokeWidth="1"
            onClick={() => moverFicha(columna, fila, 'red')} // Al hacer clic en la casilla, mover la ficha roja
          />
        ))
      )}

      {/* Dibujar las fichas */}
      {fichas.map((ficha, index) => {
        const x = ficha.casillaX * anchoCasilla + anchoCasilla / 2;
        const y = ficha.casillaY * altoCasilla + altoCasilla / 2;

        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={20} // Radio de la ficha
            fill={ficha.color}
            onClick={(e) => e.stopPropagation()} // Evitar que el clic de la ficha mueva el tablero
          />
        );
      })}
    </svg>
  );
};

export default Tablero;
