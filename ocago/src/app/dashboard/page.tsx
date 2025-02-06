"use client";

import React, {} from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { UPDATE_USER_STATE } from "@/lib/endpoints/config";
import { FETCH_PUT } from "@/lib/endpoints/useFetch";
import { Link } from "lucide-react";


export default function Dashboard() {
    const { logout } = useAuth(); 
    const router = useRouter()
    const {userInfo} = useAuth();
    const url = UPDATE_USER_STATE(0, userInfo?.id);
    const {isAuthenticated} = useAuth();
    
    
    const handleNavigateHome = () => {
        router.push("/");
    }
    

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <p className="text-2xl font-semibold text-red-600 mb-6 font-fredoka">
              ¡Inicia sesión para poder entrar!
            </p>
            <Link
              href="/"
              className="text-lg text-blue-600 hover:text-blue-500 transition-colors font-montserrat"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      );
    }
 

    const { email, role, unique_name, family_name } = userInfo;
    console.log(userInfo.id);

    const handleLogout = () => {
        logout();
        FETCH_PUT(url)
          .then(response => response.json())
          .then(data => {
            console.log("Respuesta:", data);
          })
          .catch(error => {
            console.error("Error en la solicitud:", error);
          });
        handleNavigateHome()
        };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#2E1B6B]">
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
