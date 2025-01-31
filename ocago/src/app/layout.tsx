import './globals.css'
import type { Metadata } from 'next'
import { Fredoka } from 'next/font/google'
import { Montserrat } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import { WebSocketProvider } from '@/context/WebSocketContext'



const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
})

// Initialize the Montserrat font
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-montserrat',
})

export const metadata: Metadata = {
  title: 'OcaGo! - El juego clásico de la oca',
  description: 'El juego clásico de la oca, con amigos.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${fredoka.variable} ${montserrat.variable}`}>
        <AuthProvider>
          <WebSocketProvider>
            {children}
          </WebSocketProvider>
        </AuthProvider>
      </body>

    </html>
  )
}

