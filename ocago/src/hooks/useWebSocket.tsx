import { useState, useEffect, useCallback } from "react"
//USEWEBSOCKET.TSX
export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onmessage = (event: MessageEvent) => {
      setMessages((prevMessages) => [...prevMessages, event.data])
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    setSocket(ws)

    return () => {
      ws.close()
    }
  }, [url])

  const sendMessage = useCallback(
    (message: string) => {
      if (socket && isConnected) {
        socket.send(message)
      }
    },
    [socket, isConnected],
  )

  return { isConnected, messages, sendMessage }
}

