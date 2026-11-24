import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * CORS para la API (antes `apps/web/middleware.ts`).
 *
 * En Next 16 la convención `middleware` pasó a llamarse `proxy`, y con la app
 * en `src/app` el archivo tiene que vivir en `src/`, al lado de `app`. El
 * `middleware.ts` en la raíz de apps/web nunca se ejecutaba (hallazgo H7).
 *
 * Solo hace CORS; no toca la autenticación (cada ruta valida su Bearer).
 * La app nativa no manda Origin y no necesita CORS: esto es para Expo web
 * (`npx expo start --web`) y herramientas en el navegador.
 */
const allowedOrigins = new Set([
  // Expo web en desarrollo (Metro) y el puerto del webpack antiguo de Expo
  'http://localhost:8081',
  'http://localhost:19006',
  // next dev
  'http://localhost:3000',
  // producción
  'https://poker-enfermos.vercel.app',
])

const ALLOW_METHODS = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
const ALLOW_HEADERS = 'Content-Type, Authorization, X-Requested-With'

function isAllowedOrigin(origin: string): boolean {
  // exp:// lo mandan algunas herramientas de Expo (dev client); se conserva.
  return allowedOrigins.has(origin) || origin.startsWith('exp://')
}

function applyCors(headers: Headers, origin: string) {
  if (isAllowedOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', ALLOW_METHODS)
    headers.set('Access-Control-Allow-Headers', ALLOW_HEADERS)
  }
  // La respuesta depende del Origin: que ningún cache la comparta entre orígenes.
  headers.append('Vary', 'Origin')
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? ''

  // Preflight: se responde aquí, sin llegar a la ruta.
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    applyCors(response.headers, origin)
    if (isAllowedOrigin(origin)) response.headers.set('Access-Control-Max-Age', '86400')
    return response
  }

  const response = NextResponse.next()
  applyCors(response.headers, origin)
  return response
}

// Solo las rutas de la API
export const config = {
  matcher: '/api/:path*',
}
