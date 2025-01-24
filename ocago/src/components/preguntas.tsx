import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


export function Preguntas() {
  return (
    <>
    <div className="mt-auto m-right-8 mb-8 md:-right-16 w-full md:w-1/2 mx-auto text-white hover:text-gray-200 transition-colors font-montserrat">
        <h1 className='text-3xl font-size: 1.875rem'>Preguntas Frecuentes</h1>
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
      </>
  );
}
