"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { LOGIN_URL, REGISTER_URL } from "@/lib/endpoints/config";


interface JwtPayload {
  id: string;
}

interface DecodedToken {
  avatarUrl: string;
  email: string;
  role: string;
  unique_name: string;
  family_name?: string;
  nbf: number;
  exp: number;
  iat: number;
  id: number;
}

interface AuthContextType {
  token: string | null;
  userId: string | null;
  userInfo: DecodedToken | null;
  login: (mail: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (nickname: string, email: string, password: string, avatarUrl: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const extractUserId = (accessToken: string): string | null => {
    try {
      const decoded = jwtDecode<JwtPayload>(accessToken);
      return decoded.id ? String(decoded.id) : null;
    } catch (error) {
      console.error("⚠️ Error al decodificar JWT:", error);
      return null;
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");

    if (savedToken) {
      try {
        const decodedToken = jwtDecode<DecodedToken>(savedToken);
        setUserInfo(decodedToken);
        const extractedUserId = extractUserId(savedToken);
        if (extractedUserId) {
          setToken(savedToken);
          setUserId(extractedUserId);
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        logout();
      }
    }
  }, []);

  const login = async (mail: string, password: string, rememberMe: boolean) => {
    try {
      const response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mail, password }),
      });
  
      const data = await response.json();
  
      if (!data?.accessToken) throw new Error("⚠️ Token de acceso inválido");
  
      const extractedUserId = extractUserId(data.accessToken);
      if (!extractedUserId) throw new Error("⚠️ No se pudo extraer userId");
  
      const decodedToken = jwtDecode<DecodedToken>(data.accessToken);
      setUserInfo(decodedToken);
  
      setToken(data.accessToken);
      setUserId(extractedUserId);
      setIsAuthenticated(true);
  
      if (typeof window !== "undefined") {
        if (rememberMe) {
          localStorage.setItem("accessToken", data.accessToken);
        } else {
          sessionStorage.setItem("accessToken", data.accessToken);
        }
      }
    } catch (error) {
      console.error("❌ Error en login:", error);
      throw error;
    }
  };

  const register = async (nickname: string, mail: string, password: string, avatarUrl: string) => {
    try {
      const response = await fetch(REGISTER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, mail, password, avatarUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "⚠️ Error en el registro");
      }

      const data = await response.json();
      if (!data?.accessToken) throw new Error("⚠️ Token de acceso inválido");

      const extractedUserId = extractUserId(data.accessToken);
      if (!extractedUserId) throw new Error("⚠️ No se pudo extraer el userId");

      const decodedToken = jwtDecode<DecodedToken>(data.accessToken);
      setUserInfo(decodedToken);

      setToken(data.accessToken);
      setUserId(extractedUserId);
      setIsAuthenticated(true);

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.accessToken);
      }
    } catch (error) {
      console.error("❌ Error en registro:", error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    setUserInfo(null);
    setIsAuthenticated(false);

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
    }
  };

  return (
    <AuthContext.Provider value={{ token, userId, userInfo, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};