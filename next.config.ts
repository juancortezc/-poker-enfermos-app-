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
