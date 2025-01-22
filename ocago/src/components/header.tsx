import React from 'react';
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'


export function Header() {

  return (
    <>
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
          <Link
            href="/menu"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            menú
          </Link>
          <Link
            href="/login"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
            
          >
            Inicia Sesión
          </Link>
          <Link
            href="/register"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
           
          >
            Regístrate
          </Link>
          
          
        </div>
      </nav>
      </>
  );
}
