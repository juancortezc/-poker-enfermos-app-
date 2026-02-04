'use client'

import React, { createContext, useContext, ReactNode } from 'react'

// Socket.io has been replaced with SSE for timer updates
// This context is kept for backwards compatibility but does nothing

interface SocketContextValue {
  socket: null
  isConnected: boolean
  transport: string
  serverTimeOffset: number
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
  children: ReactNode
}

/**
 * Legacy SocketProvider - Socket.io has been replaced with SSE
 * This provider is kept for backwards compatibility but does nothing.
 * Timer updates now use useTimerSSE hook which connects to /api/timer/stream/[id]
 */
export function SocketProvider({ children }: SocketProviderProps) {
  // No-op provider - socket.io has been replaced with SSE
  return (
    <SocketContext.Provider
      value={{
        socket: null,
        isConnected: false,
        transport: 'SSE',
        serverTimeOffset: 0,
        joinTimerRoom: () => {},
        leaveTimerRoom: () => {}
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
