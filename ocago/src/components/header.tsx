import React from 'react';
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { LoginForm } from '@/components/login-form'
import { RegisterForm } from '@/components/register-form'


const Modal = dynamic(() => import('@/components/modal').then(mod => mod.Modal), { ssr: false })

export function Header() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
      const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    
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
            menu
          </Link>
          <Link
            href="/login"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
            onClick={() => setIsLoginModalOpen(true)}
          >
            Inicia Sesión
          </Link>
          <Link
            href="/Register"
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
            onClick={() => setIsRegisterModalOpen(true)}
          >
            Regístrate
          </Link>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Inicia Sesión
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="text-white hover:text-gray-200 transition-colors font-montserrat"
          >
            Regístrate
          </button>
        </div>
      </nav>
            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)}>
              <LoginForm onClose={() => setIsLoginModalOpen(false)} />
            </Modal>
            <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)}>
              <RegisterForm onClose={() => setIsRegisterModalOpen(false)} />
            </Modal>
      </>
  );
}
