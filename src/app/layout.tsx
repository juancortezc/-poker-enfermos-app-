import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/contexts/AuthContext'
import { PlayerSearchProvider } from '@/contexts/PlayerSearchContext'
import { AppLayout } from '@/components/AppLayout'
import { ToastContainer } from 'react-toastify'
import { SWRProvider } from '@/lib/swr-config'
import { OfflineIndicator } from '@/components/OfflineIndicator'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Poker de Enfermos",
  description: "Aplicación para gestión de torneos de poker - Sistema ELIMINA 2",
  manifest: "/manifest.json",
  themeColor: "#E10600",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poker Enfermos",
    startupImage: [
      {
        url: "/icons/icon-192x192.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/icons/icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/icons/icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/icons/icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" }
    ]
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Poker Enfermos",
    "application-name": "Poker Enfermos",
    "msapplication-TileColor": "#E10600",
    "msapplication-TileImage": "/icons/icon-144x144.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <SWRProvider>
          <AuthProvider>
            <PlayerSearchProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </PlayerSearchProvider>
          </AuthProvider>
        </SWRProvider>
        <OfflineIndicator />
        <ToastContainer
          position="bottom-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}
