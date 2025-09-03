import { NextResponse } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as ServerIO } from 'socket.io'

let io: ServerIO | null = null

export async function GET() {
  if (!io) {
    console.log('Initializing Socket.IO server...')
    
    // En production, necesitarás configurar esto apropiadamente
    const httpServer = new NetServer()
    io = new ServerIO(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.NEXTAUTH_URL 
          : 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    })

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join-timer', (gameDateId: number) => {
        socket.join(`timer-${gameDateId}`)
        console.log(`Client ${socket.id} joined timer-${gameDateId}`)
      })

      socket.on('timer-start', ({ gameDateId, performedBy, metadata }) => {
        console.log('Timer start:', { gameDateId, performedBy })
        socket.to(`timer-${gameDateId}`).emit('timer-started', {
          gameDateId,
          performedBy,
          metadata,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('timer-pause', ({ gameDateId, performedBy, metadata }) => {
        console.log('Timer pause:', { gameDateId, performedBy })
        socket.to(`timer-${gameDateId}`).emit('timer-paused', {
          gameDateId,
          performedBy,
          metadata,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('timer-resume', ({ gameDateId, performedBy, metadata }) => {
        console.log('Timer resume:', { gameDateId, performedBy })
        socket.to(`timer-${gameDateId}`).emit('timer-resumed', {
          gameDateId,
          performedBy,
          metadata,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('timer-level-up', ({ gameDateId, performedBy, fromLevel, toLevel }) => {
        console.log('Timer level up:', { gameDateId, fromLevel, toLevel })
        socket.to(`timer-${gameDateId}`).emit('timer-level-changed', {
          gameDateId,
          performedBy,
          fromLevel,
          toLevel,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  return NextResponse.json({ success: true, message: 'Socket initialized' })
}