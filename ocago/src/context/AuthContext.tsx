"use client";

import { LOGIN_URL, REGISTER_URL } from "@/lib/endpoints/config";
import { FETCH_POST } from "@/lib/endpoints/useFetch";
import React, { createContext, useContext, useState, useEffect } from "react";

// Interfaz para el contexto de autenticación
interface AuthContextType {
    token: string | null;
    login: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
    register: (nickname: string, email: string, password: string, avatarUrl:string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

// Crear el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    useEffect(() => {
        const savedToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
        if (savedToken) {
            setToken(savedToken);
        }
    }, []);

    useEffect(() => {
        setIsAuthenticated(!!token);
    }, [token]);

    const login = async (mail: string, password: string, rememberMe: boolean) => {
        try {
            console.log("Sending login request:", { mail, password });
    
            // Realiza la solicitud al backend
            const data = await FETCH_POST(LOGIN_URL, { mail, password });
            console.log("Server Response:", data);
    
            // Extrae el token desde la propiedad `accessToken`
            if (!data?.accessToken) {
                throw new Error("Server did not return a valid accessToken");
            }
    
            setToken(data.accessToken);
            setIsAuthenticated(true);
    
            // Almacenar el token en localStorage o sessionStorage según la preferencia del usuario
            if (rememberMe) {
                localStorage.setItem("authToken", data.accessToken);
                sessionStorage.setItem("authToken", data.accessToken);
            }
        } catch (error: any) {
            console.error("Login failed:", error.message || error);
            throw new Error(error.message || "Login failed. Please check your credentials.");
        }
    };

    const register = async (nickname: string, mail: string, password: string, avatarUrl: string) => {
        try {
    
            console.log("Sending registration data:", { mail, nickname, password, role: null, avatarUrl });
    
            const body = JSON.stringify({
                mail,
                nickname,
                password,
                role: null, // Cambia esto según sea necesario
                avatarUrl,
            });
    
            const response = await fetch(REGISTER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body,
            });
    
            // Verificar si la respuesta es exitosa
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to register");
            }
    
            const data = await response.json();
            console.log("Registration Response:", data);
    
            if (!data?.accessToken) {
                throw new Error("Server did not return a valid accessToken");
            }
    
            setToken(data.accessToken);
            localStorage.setItem("authToken", data.accessToken);
            sessionStorage.setItem("authToken", data.accessToken)
        } catch (error: any) {
            console.error("Registration failed:", error.message || error);
            throw new Error("Registration failed. Please try again.");
        }
    };
    
    
    

    const logout = () => {
        setToken(null);
        localStorage.removeItem("authToken");
        sessionStorage.removeItem("authToken");
    };

    return (
        <AuthContext.Provider value={{ token, login, register, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
