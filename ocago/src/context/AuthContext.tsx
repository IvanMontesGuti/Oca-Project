"use client";

import { LOGIN_URL, REGISTER_URL } from "@/lib/endpoints/config";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useContext, useState, useEffect } from "react";

interface JwtPayload {
    id: string;
  }
  
  interface AuthContextType {
    token: string | null;
    userId: string | null;
    login: (mail: string, password: string, rememberMe: boolean) => Promise<void>;
    register: (nickname: string, email: string, password: string, avatarUrl: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
  }
  
  const AuthContext = createContext<AuthContextType | undefined>(undefined);
  
  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
    const extractUserId = (accessToken: string): string | null => {
        try {
          const decoded = jwtDecode<JwtPayload>(accessToken);
          console.log("Decoded JWT:", decoded); 
          return decoded.id || null; 
        } catch (error) {
          console.error("⚠️ Error decoding JWT:", error);
          return null;
        }
      };
      
      
  
    useEffect(() => {
      if (typeof window !== "undefined") {
        const savedToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken");
        if (savedToken) {
          setToken(savedToken);
          setUserId(extractUserId(savedToken));
        }
      }
    }, []);
  
    useEffect(() => {
      setIsAuthenticated(!!token);
    }, [token]);
  
    const login = async (mail: string, password: string, rememberMe: boolean) => {
      try {
        const response = await fetch(LOGIN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mail, password }),
        });
  
        if (!response.ok) throw new Error("⚠️ Login failed");
  
        const data = await response.json();
        if (!data?.accessToken) throw new Error("⚠️ Invalid accessToken");
  
        const extractedUserId = extractUserId(data.accessToken);
        if (!extractedUserId) throw new Error("⚠️ Could not extract userId");
  
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
        console.error("❌ Login failed:", error);
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
  
        if (!response.ok) throw new Error("⚠️ Registration failed");
  
        const data = await response.json();
        if (!data?.accessToken) throw new Error("⚠️ Invalid accessToken");
  
        const extractedUserId = extractUserId(data.accessToken);
        if (!extractedUserId) throw new Error("⚠️ Could not extract userId");
  
        setToken(data.accessToken);
        setUserId(extractedUserId);
  
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.accessToken);
        }
      } catch (error) {
        console.error("❌ Registration failed:", error);
        throw error;
      }
    };
  
    const logout = () => {
      setToken(null);
      setUserId(null);
      setIsAuthenticated(false);
  
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("accessToken");
      }
    };
  
    return (
      <AuthContext.Provider value={{ token, userId, login, register, logout, isAuthenticated }}>
        <WebSocketProvider userId={userId}>{children}</WebSocketProvider>
      </AuthContext.Provider>
    );
  };
  
  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
  };
  