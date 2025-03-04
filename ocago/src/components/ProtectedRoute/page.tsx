"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"


interface ProtectedRouteProps{
    children: React.ReactNode
    requiredRole?: "user" | "admin"
}

export default function ProtectedRoute({children, requiredRole}: ProtectedRouteProps){
    const {userInfo, isAuthenticated} = useAuth();
    const router = useRouter();

    useEffect(() =>{
        if(!isAuthenticated){
            toast.error("No puedes acceder a esta vista porque no estas logueado!", { duration: 3000, icon: "❌" });
            router.push("/login");
        }
    }) 
    useEffect(() => {
        if(userInfo?.role !== requiredRole){

        toast.error("No puedes acceder a esta vista!", { duration: 3000, icon: "❌" });

        router.push("/");
        }
    }, [isAuthenticated, userInfo, requiredRole, router])


    return <>{children}</>
}