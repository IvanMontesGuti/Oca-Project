'use client';

import Tablero from "@/app/gamePrueba/page";

const Home = () => {
    const imagenUrl = '/images/tablero.svg'; // La URL de la imagen del tablero
    const fichas = [
      { casillaX: 2, casillaY: 3, color: 'red' },
      { casillaX: 5, casillaY: 6, color: 'blue' },
      { casillaX: 7, casillaY: 1, color: 'green' },
      // Añadir más fichas con sus posiciones (casillaX, casillaY)
    ];
  
    return (
      <div>
        <h1>Mi tablero de juego</h1>
        <Tablero imagenUrl={imagenUrl} fichas={fichas} />
      </div>
    );
  };
  
  export default Home;
  