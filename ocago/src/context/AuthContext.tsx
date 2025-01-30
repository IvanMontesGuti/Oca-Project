"use client"

import { LOGIN_URL, REGISTER_URL } from "@/lib/endpoints/config"
import { FETCH_POST } from "@/lib/endpoints/useFetch"
import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

interface AuthContextType {
  token: string | null
  userId: number | null
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<void>
  register: (nickname: string, email: string, password: string, avatarUrl: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  socket: WebSocket | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [socket, setSocket] = useState<WebSocket | null>(null)

  const decodeToken = (token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      return payload.id
    } catch (error) {
      console.error("Error decoding token:", error)
      return null
    }
  }

  useEffect(() => {
    const savedToken = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
    const savedUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId")
    if (savedToken && savedUserId) {
      setToken(savedToken)
      setUserId(Number(savedUserId))
      setIsAuthenticated(true)
      connectWebSocket(Number(savedUserId))
    }
  }, [])

  const connectWebSocket = (userId: number) => {
    const ws = new WebSocket(`wss://localhost:7107/socket/${userId}`)

    ws.onopen = () => console.log("✅ WebSocket conectado")
    ws.onmessage = (event) => console.log("📩 Mensaje recibido:", event.data)
    ws.onclose = () => console.log("❌ WebSocket cerrado")
    ws.onerror = (error) => console.error("⚠️ Error en WebSocket:", error)

    setSocket(ws)
  }

  const login = async (mail: string, password: string, rememberMe: boolean) => {
    try {
      console.log("Sending login request:", { mail, password: "********" })

      const data = await FETCH_POST(LOGIN_URL, { mail, password })
      console.log("Server Response:", data)

      if (!data?.accessToken) {
        throw new Error("Server did not return a valid accessToken")
      }

      const userId = decodeToken(data.accessToken)
      if (!userId) {
        throw new Error("Could not extract user ID from token")
      }

      setToken(data.accessToken)
      setUserId(userId)
      setIsAuthenticated(true)

      if (rememberMe) {
        localStorage.setItem("authToken", data.accessToken)
        localStorage.setItem("userId", userId.toString())
      } else {
        sessionStorage.setItem("authToken", data.accessToken)
        sessionStorage.setItem("userId", userId.toString())
      }

      // Conectar al WebSocket después de iniciar sesión
      connectWebSocket(userId)
    } catch (error: any) {
      console.error("Login failed:", error.message || error)
      throw new Error(error.message || "Login failed. Please check your credentials.")
    }
  }

  const register = async (nickname: string, mail: string, password: string, avatarUrl: string) => {
    try {
      console.log("Sending registration data:", { mail, nickname, password, avatarUrl })

      const response = await FETCH_POST(REGISTER_URL, {
        mail,
        nickname,
        password,
        role: null,
        avatarUrl,
      })

      console.log("Registration Response:", response)

      if (!response?.accessToken) {
        throw new Error("Server did not return a valid accessToken")
      }

      const userId = decodeToken(response.accessToken)
      if (!userId) {
        throw new Error("Could not extract user ID from token")
      }

      setToken(response.accessToken)
      setUserId(userId)
      setIsAuthenticated(true)
      localStorage.setItem("authToken", response.accessToken)
      localStorage.setItem("userId", userId.toString())

      // Conectar al WebSocket después de registrarse
      connectWebSocket(userId)
    } catch (error: any) {
      console.error("Registration failed:", error.message || error)
      throw new Error("Registration failed. Please try again.")
    }
  }

  const logout = () => {
    setToken(null)
    setUserId(null)
    setIsAuthenticated(false)
    localStorage.removeItem("authToken")
    localStorage.removeItem("userId")
    sessionStorage.removeItem("authToken")
    sessionStorage.removeItem("userId")
    if (socket) {
      socket.close()
      setSocket(null)
    }
  }

  return (
    <AuthContext.Provider value={{ token, userId, login, register, logout, isAuthenticated, socket }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

