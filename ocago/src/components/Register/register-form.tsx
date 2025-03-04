import type React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";

import { IMAGE_POST_URL } from "@/lib/endpoints/config";
import { useRouter } from "next/navigation";


export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { register } = useAuth();
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
  
    const nickname = form.nickname.value.trim();
    const mail = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
  
    if (!nickname || !mail || !password || !confirmPassword) {
      console.error("Todos los campos son obligatorios.");
      return;
    }
  
    
  
    try {
      const avatarPath = `images/${nickname}.png`;  // 📌 Corrigiendo el formato
  
      // 📦 Enviar el rol junto con los datos
      await register(nickname, mail, password, avatarPath);
  
      // Subir avatar si existe
      if (avatar) {
        const formData = new FormData();
        formData.append("name", `${nickname}.png`);
        formData.append("file", avatar, `${nickname}.png`);
  
        const response = await fetch(IMAGE_POST_URL, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          console.error("❌ Error al subir la imagen:", await response.text());
          throw new Error("Error subiendo la imagen.");
        }
      }
  
      router.push("/menu");
      
    } catch (error) {
      console.error("Error durante el registro o la subida de imagen:", error);
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
    <div className={cn("flex flex-col", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-1">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold font-fredoka text-blue-950">
                  Crea tu cuenta
                </h1>
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
                <Input id="password" name="password" type="password" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
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
              <Button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-900"
              >
                Registrarse
              </Button>
              <div className="text-center text-sm">
                ¿Ya tienes una cuenta?{" "}
                <a href="/login" className="underline underline-offset-4">
                  Inicia sesión
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        Al hacer click en registrarse aceptas nuestros{" "}
        <a href="#">Términos de Servicio</a> y nuestra{" "}
        <a href="#">Política de Privacidad</a>.
      </div>
    </div>
  );
}
