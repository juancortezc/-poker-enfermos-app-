import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // Las respuestas de la API NO se cachean.
  //
  // El default del plugin las guarda 24 h con NetworkFirst y 10 s de paciencia:
  // en la sede, con la red saturada, cualquier peticion que pasara de 10 s
  // devolvia los numeros de ANTES de la fecha como si fueran buenos, y se
  // "arreglaba sola" cuando alguna respondia a tiempo. Ademas la clave no
  // distinguia usuario, asi que un cache podia cruzarse entre personas.
  //
  // Durante una fecha en vivo, no tener datos es mucho mejor que tener datos
  // viejos disfrazados de actuales.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
          sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly" as const,
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Next 16 arranca en Turbopack por defecto. El plugin de PWA inyecta un
  // config de `webpack`, y ver uno sin config de turbopack es un error duro:
  // `npm run dev` no levantaba.
  //
  // En desarrollo el plugin se desactiva solo (disable: NODE_ENV === development),
  // asi que no hay nada de PWA que perder y Turbopack corre mas rapido. El build
  // de produccion SI necesita el paso de webpack del plugin para generar el
  // service worker, y por eso el script conserva `next build --webpack`.
  // Si algun dia se quita ese flag, el sw.js deja de generarse en silencio.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/poker-enfermos/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/poker-enfermos-media/**',
      },
    ],
  },
  // DEUDA CONOCIDA: el build ignora los errores de TypeScript.
  //
  // Hoy `npx tsc --noEmit` reporta ~46 errores reales repartidos en repos de
  // Prisma, hooks y formularios. Apagar esta bandera sin limpiarlos primero
  // deja el proyecto sin poder desplegar, asi que se documenta en vez de
  // quitarla a ciegas.
  //
  // Correrlo de vez en cuando igual sirve: es lo que destapo, entre otros,
  // que PrismaTournamentRepository espera campos que no existen en el schema.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize for production
  compress: true,
  poweredByHeader: false,
};

export default withPWA(nextConfig);
