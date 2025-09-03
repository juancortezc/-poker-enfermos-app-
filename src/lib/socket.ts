import { Server as NetServer } from 'http'
import { NextApiRequest, NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new ServerIO(res.socket.server)
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('join-timer', (gameDateId: number) => {
        socket.join(`timer-${gameDateId}`)
        console.log(`Client ${socket.id} joined timer-${gameDateId}`)
      })

      socket.on('timer-action', ({ action, gameDateId, performedBy, metadata }) => {
        console.log('Timer action received:', { action, gameDateId, performedBy })
        
        socket.to(`timer-${gameDateId}`).emit('timer-update', {
          action,
          performedBy,
          metadata,
          timestamp: new Date().toISOString(),
        })
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }
  res.end()
}

export default SocketHandler