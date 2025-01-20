'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation'; // Importa useRouter de Next.js
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const router = useRouter(); // Hook de Next.js para la navegación

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if ((email && nickname) || (!email && !nickname)) {
      alert('Por favor, introduce solo tu correo electrónico o tu nickname, no ambos.');
      return;
    }

    const user = {
      identifier: email || nickname,
      password,
    };

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        throw new Error('Error al iniciar sesión.');
      }

      console.log('Sesión iniciada con éxito');
      
      // Redirige al usuario a la página de menú o la página principal
      router.push('/menu'); // Cambia '/menu' a la ruta que desees

    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold font-fredoka text-blue-950">Bienvenido de vuelta</h1>
                <p className="text-balance text-muted-foreground font-montserrat">
                  Inicia sesión en tu cuenta de OcaGo!
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-or-nickname">Correo o Nickname</Label>
                <Input
                  id="email-or-nickname"
                  type="text"
                  placeholder="Correo electrónico o Nickname"
                  value={email || nickname}
                  onChange={(e) => {
                    if (e.target.value.includes('@')) {
                      setEmail(e.target.value);
                      setNickname('');
                    } else {
                      setNickname(e.target.value);
                      setEmail('');
                    }
                  }}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <Label htmlFor="remember-me">Mantener sesión iniciada</Label>
              </div>
              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-900">
                Iniciar Sesión
              </Button>
              <div className="text-center text-sm">
                ¿No tienes cuenta?{" "}
                <a className="underline underline-offset-4">
                  Regístrate
                </a>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/login.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        Al hacer click en continuar aceptas nuestros <a href="#">Términos de Servicio</a>{" "}
        y nuestra <a href="#">Política de Privacidad</a>.
      </div>
    </div>
  );
}
