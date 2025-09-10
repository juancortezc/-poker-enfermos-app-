import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/poker-enfermos/**',
      },
    ],
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  sw: 'sw.js',
  buildExcludes: [/middleware-manifest\.json$/],
  cacheStartUrl: true,
  dynamicStartUrl: false,
  reloadOnOnline: true,
  
  // Cache strategies
  runtimeCaching: [
    {
      urlPattern: /^https?.*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/tournaments\/.*\/ranking$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'ranking-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 60, // 30 minutes
        },
      },
    },
    {
      urlPattern: /\/api\/tournaments\/active$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'active-tournament-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    {
      urlPattern: /\/api\/game-dates\/active$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'active-gamedate-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 1 * 60, // 1 minute
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
