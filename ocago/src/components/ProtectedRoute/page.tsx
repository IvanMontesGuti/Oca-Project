"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"


interface ProtectedRouteProps{
    children: React.ReactNode
    adminOnly?: boolean
}

export default function ProtectedRoute({children, adminOnly = false}: ProtectedRouteProps){
    const {userInfo, isAuthenticated} = useAuth();
    const router = useRouter();
    

    useEffect(() =>{
        if(!isAuthenticated){
            toast.error("No puedes acceder a esta vista porque no estas logueado!", { duration: 3000, icon: "❌" });
            router.push("/login");
        }
    }, [isAuthenticated, router]) 

    useEffect(() => {
        if(userInfo?.role === "bloqueado"){

        toast.error("Tu acceso ha sido restringido por un administrador!", { duration: 3000, icon: "🚫" });

        router.push("/");
        }
    }, [userInfo, router])

    useEffect(() => {
        if(adminOnly && userInfo?.role !== "admin"){

        toast.error("Acceso solo para administradores", { duration: 3000, icon: "⚠️" });

        router.push("/");
        }
    }, [adminOnly, userInfo, router])

    return <>{children}</>
}