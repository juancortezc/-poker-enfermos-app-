'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

interface SocketContextValue {
  socket: Socket | null
  isConnected: boolean
  transport: string
  serverTimeOffset: number // Diferencia entre reloj del servidor y cliente (ms)
  joinTimerRoom: (gameDateId: number) => void
  leaveTimerRoom: (gameDateId: number) => void
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  transport: 'N/A',
  serverTimeOffset: 0,
  joinTimerRoom: () => {},
  leaveTimerRoom: () => {}
})

export function useSocketContext() {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: React.ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [transport, setTransport] = useState('N/A')
  const [serverTimeOffset, setServerTimeOffset] = useState(0)
  const joinedRoomsRef = useRef<Set<number>>(new Set())
  const reconnectAttemptsRef = useRef(0)

  // Inicializar socket una sola vez
  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL || ''
      : 'http://localhost:3000'

    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    })

    function onConnect() {
      setIsConnected(true)
      setTransport(socketInstance.io.engine?.transport?.name || 'N/A')
      reconnectAttemptsRef.current = 0

      // Re-join a todas las rooms guardadas después de reconexión
      joinedRoomsRef.current.forEach((gameDateId) => {
        socketInstance.emit('join-timer', gameDateId)
      })

      // Solicitar tiempo del servidor para calcular offset
      const clientTime = Date.now()
      socketInstance.emit('sync-time', { clientTime })
    }

    function onDisconnect() {
      setIsConnected(false)
      setTransport('N/A')
    }

    function onReconnect() {
      reconnectAttemptsRef.current++
    }

    function onTimeSync(data: { serverTime: number; clientTime: number }) {
      // Calcular offset: serverTime - clientTime
      // Si positivo, servidor está adelante; si negativo, cliente está adelante
      const roundTripTime = Date.now() - data.clientTime
      const estimatedServerTime = data.serverTime + roundTripTime / 2
      const offset = estimatedServerTime - Date.now()
      setServerTimeOffset(offset)
    }

    function onUpgrade() {
      setTransport(socketInstance.io.engine?.transport?.name || 'N/A')
    }

    socketInstance.on('connect', onConnect)
    socketInstance.on('disconnect', onDisconnect)
    socketInstance.on('reconnect', onReconnect)
    socketInstance.on('time-sync', onTimeSync)
    socketInstance.io.engine?.on('upgrade', onUpgrade)

    setSocket(socketInstance)

    return () => {
      socketInstance.off('connect', onConnect)
      socketInstance.off('disconnect', onDisconnect)
      socketInstance.off('reconnect', onReconnect)
      socketInstance.off('time-sync', onTimeSync)
      socketInstance.io.engine?.off('upgrade', onUpgrade)
      socketInstance.disconnect()
    }
  }, [])

  // Manejar visibilitychange para re-sync cuando vuelve de background
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && socket?.connected) {
        // Re-solicitar tiempo del servidor
        const clientTime = Date.now()
        socket.emit('sync-time', { clientTime })

        // Re-join a rooms por si se perdió conexión
        joinedRoomsRef.current.forEach((gameDateId) => {
          socket.emit('join-timer', gameDateId)
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [socket])

  const joinTimerRoom = useCallback((gameDateId: number) => {
    if (!gameDateId) return
    joinedRoomsRef.current.add(gameDateId)
    socket?.emit('join-timer', gameDateId)
  }, [socket])

  const leaveTimerRoom = useCallback((gameDateId: number) => {
    if (!gameDateId) return
    joinedRoomsRef.current.delete(gameDateId)
    socket?.emit('leave-timer', gameDateId)
  }, [socket])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        transport,
        serverTimeOffset,
        joinTimerRoom,
        leaveTimerRoom
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
