'use client'

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function RegisterForm({
  className,
  onClose,
  ...props
}: React.ComponentProps<"div"> & { onClose: () => void }) {
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const nickname = form.nickname.value;
    
    const user = {
      mail: form.email.value,
      nickname: nickname,
      password: form.password.value,
      role: null,
      avatarurl: `images/${nickname}.png`,
    };

    try {
      const userResponse = await fetch('https://localhost:7107/api/Auth/Register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });

      if (!userResponse.ok) throw new Error('Error al registrar el usuario.');

      console.log('Usuario registrado con éxito.');

      if (avatar) {
        const arrayBuffer = await avatar.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: 'image/png' });
        const renamedFile = new File([blob], `${nickname}.png`, { type: 'image/png' });
        
        const formData = new FormData();
        formData.append('name', `${nickname}.png`); 
        formData.append('file', renamedFile);
      
        const imageResponse = await fetch('https://localhost:7107/api/Images', {
          method: 'POST',
          body: formData,
        });
      
        if (!imageResponse.ok) throw new Error('Error al registrar el avatar.');
      
        console.log('Avatar registrado con éxito.');
      }
      

      onClose();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold font-fredoka text-blue-950">Crea tu cuenta</h1>
                <p className="text-balance text-muted-foreground font-montserrat">
                  Regístrate para comenzar a usar OcaGo!
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  type="text"
                  placeholder="TuNickname123"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avatar">Avatar</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={preview || undefined} alt="Avatar" />
                    <AvatarFallback>AV</AvatarFallback>
                  </Avatar>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-900">
                Registrarse
              </Button>
              <div className="text-center text-sm">
                ¿Ya tienes una cuenta?{" "}
                <a href="#" className="underline underline-offset-4">
                  Inicia sesión
                </a>
              </div>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/register.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        Al hacer click en registrarse aceptas nuestros <a href="#">Términos de Servicio</a>{" "}
        y nuestra <a href="#">Política de Privacidad</a>.
      </div>
    </div>
  );
}
