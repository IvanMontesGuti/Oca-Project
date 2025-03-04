"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"


const FormSchema = z.object({
  email: z.string().email({
    message: "Por favor, ingrese una dirección de correo electrónico válida.",
  }),
  password: z.string().min(8, {
    message: "La contraseña debe tener al menos 8 caracteres.",
  }),
})

export function LoginForm() {
  
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-montserrat">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-8 shadow-lg">
        <h2 className="text-center text-3xl font-bold text-primary font-fredoka">Iniciar Sesión</h2>
        <Form {...form}>
          <form className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="tu@ejemplo.com" {...field} className="bg-input text-primary" />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary">Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="bg-input text-primary" />
                  </FormControl>
                  <FormMessage className="text-destructive" />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Iniciar Sesión
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}

