"use client";

import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface DecodedToken {
    email: string;
    role: string;
    unique_name: string;
    family_name?: string; // URL del avatar
    nbf: number;
    exp: number;
    iat: number;
}

export default function Dashboard() {
    const { logout } = useAuth(); // Obtenemos la función de logout del contexto
    const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);
    const router = useRouter()
    
    const handleNavigateHome = () => {
        router.push("/");
    }
    useEffect(() => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("authToken");

            if (token) {
                try {
                    const decodedToken = jwtDecode<DecodedToken>(token);
                    setUserInfo(decodedToken);
                } catch (error) {
                    console.error("Error al decodificar el token:", error);
                }
            }
        }
    }, []);

    if (!userInfo) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <p className="text-xl text-red-600">¡Inicia Sesion para poder entrar!</p>
                <button
                    onClick={handleNavigateHome}
                    className="flex items-center mt-4 w-full bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-700"
                >
                    Volver Inicio
                </button>
            </div>
        );
    }

    const { email, role, unique_name, family_name } = userInfo;

    const handleLogout = () => {
        logout();
        handleNavigateHome()
        };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white shadow-lg rounded-lg p-8 w-96">
                <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
                    Bienvenido, {unique_name}!
                </h1>
                {family_name && (
                    <img
                        src={"https://localhost:7107/" + family_name}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full mx-auto mb-4 border border-gray-300"
                    />
                )}
                <p className="text-gray-700 text-center mb-2">
                    <span className="font-semibold">Email:</span> {email}
                </p>
                <button
                    onClick={handleLogout}
                    className="mt-4 w-full bg-red-500 text-white font-semibold py-2 px-4 rounded hover:bg-red-700"
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}
