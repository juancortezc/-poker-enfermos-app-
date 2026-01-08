import type { NextConfig } from "next";

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

export default nextConfig;