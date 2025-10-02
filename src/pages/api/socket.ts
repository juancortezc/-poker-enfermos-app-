import type { NextApiRequest, NextApiResponse } from 'next'
import type { Server as HTTPServer } from 'http'
import { initSocketServer } from '@/lib/server-socket'

type NextApiResponseWithSocket = NextApiResponse & {
  socket: NextApiResponse['socket'] & {
    server: HTTPServer & {
      io?: ReturnType<typeof initSocketServer>
    }
  }
}

export default function handler(_req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    res.socket.server.io = initSocketServer(res.socket.server)
  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false
  }
}

