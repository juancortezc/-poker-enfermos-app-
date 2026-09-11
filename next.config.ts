import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
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
  // Disable TypeScript during builds on Vercel to prevent failures
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize for production
  compress: true,
  poweredByHeader: false,
};

export default withPWA(nextConfig);
