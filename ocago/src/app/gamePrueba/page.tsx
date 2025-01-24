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
  const anchoCasilla = 96;  
  const altoCasilla = 108;  


  const [fichas, setFichas] = useState<Ficha[]>([
    { casillaX: 4, casillaY: 5, color: 'red' },  
    { casillaX: 3, casillaY: 7, color: 'blue' }, 
  ]);


  const moverFicha = (casillaX: number, casillaY: number, color: string) => {
    setFichas((prevFichas) => {
      return prevFichas.map((ficha) =>
        ficha.color === color 
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
            onClick={() => moverFicha(columna, fila, 'red')} 
          />
        ))
      )}

      
      {fichas.map((ficha, index) => {
        const x = ficha.casillaX * anchoCasilla + anchoCasilla / 2;
        const y = ficha.casillaY * altoCasilla + altoCasilla / 2;

        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={20} 
            fill={ficha.color}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
    </svg>
  );
};

export default Tablero;
