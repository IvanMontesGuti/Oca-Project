"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { jwtDecode } from "jwt-decode";
import { GET_USER_BY_ID_URL, LOGIN_URL, REGISTER_URL } from "@/lib/endpoints/config";
import { useRouter } from "next/navigation";
import { toast } from "sonner";


interface JwtPayload {
  id: string;
}

interface DecodedToken {
  id: string;
  nickname: string;
  avatarUrl: string;
  email: string;
  role: string;
  unique_name: string;
  family_name?: string;
}

interface AuthContextType {
  token: string | null;
  userId: string | null;
  userInfo: DecodedToken | null;
  login: (mail: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (nickname: string, email: string, password: string, avatarUrl: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUserInfo: (newInfo: Partial<DecodedToken>) => void;
  getUserRole: () => Promise<string | null>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<DecodedToken | null>(null);
  const [initialRole, setInitialRole] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter()

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
        setInitialRole(decodedToken.role) 
        const extractedUserId = extractUserId(savedToken);
        if (extractedUserId) {
          setToken(savedToken);
          setUserId(extractedUserId);
          setIsAuthenticated(true);
          updateUserRole()
        } else {
          logout();
        }
      } catch (error) {
        console.error("Error decoding token:", error);
        logout();
      }
    }
  }, []);
  useEffect(() => {
    if (initialRole && userInfo?.role && initialRole !== userInfo.role) {
      toast.info("Un administrador ha cambiado tu rol, cerrando sesión...", { duration: 3000, icon: "🔄" });
      console.log("🚫 Cierre de sesión: Rol cambiado de", initialRole, "a", userInfo.role);
      logout();
    }
  }, [initialRole, userInfo?.role]);

const updateUserRole = async () => {
    if (!userId) return;
    try {
      const response = await fetch(GET_USER_BY_ID_URL(userId), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("⚠️ Error al obtener el rol del usuario");

      const userData = await response.json();

      setUserInfo((prevInfo) => {
        if (!prevInfo) return null;
        return {
          ...prevInfo,
          role: userData.role || prevInfo.role || null,
        };
      });
    } catch (error) {
      console.error("❌ Error obteniendo rol del usuario:", error);
    }
  };

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
      setInitialRole(decodedToken.role);
      setToken(data.accessToken);
      setUserId(extractedUserId);
      setIsAuthenticated(true);
      updateUserRole()
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
      const body = {
        mail: mail,
        nickname: nickname,
        password: password,
        role: "User",  // 🚨 Asegúrate de incluir el rol aquí
        avatarUrl: avatarUrl
      };

      console.log("📦 Cuerpo enviado:", body);  // 📌 LOG para verificar el cuerpo enviado

      const response = await fetch(REGISTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Respuesta del servidor:", errorData);  // 📌 LOG para respuesta del servidor
        throw new Error(errorData.message || "⚠️ Error en el registro");
      }

      const data = await response.json();
      if (!data?.accessToken) throw new Error("⚠️ Token de acceso inválido");

      const extractedUserId = extractUserId(data.accessToken);
      if (!extractedUserId) throw new Error("⚠️ No se pudo extraer el userId");

      const decodedToken = jwtDecode<DecodedToken>(data.accessToken);
      setUserInfo(decodedToken);
      setInitialRole(data.role);
      setToken(data.accessToken);
      setUserId(extractedUserId);
      setIsAuthenticated(true);
      updateUserRole()
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
    setInitialRole(null);  

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("accessToken");
    }
    router.push("/")
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateUserInfo = (newInfo: any) => {
    setUserInfo((prevInfo) => ({ ...prevInfo, ...newInfo }))
  }

  const getUserRole = async (): Promise<string | null> => {
    if (!userId) return null;
    try {
      const response = await fetch(GET_USER_BY_ID_URL(userId), {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("⚠️ Error al obtener el rol del usuario");

      const userData = await response.json();
      return userData.role || null;
    } catch (error) {
      console.error("❌ Error obteniendo rol del usuario:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ token, userId, userInfo, login, register, logout, isAuthenticated, updateUserInfo, getUserRole }}>
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
