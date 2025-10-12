import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/contexts/AuthContext'
import { PlayerSearchProvider } from '@/contexts/PlayerSearchContext'
import { AppLayout } from '@/components/AppLayout'
import { ToastContainer } from 'react-toastify'
import { SWRProvider } from '@/lib/swr-config'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { NotificationInitializer } from '@/components/NotificationInitializer'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap'
})

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap'
})

export const metadata: Metadata = {
  title: "Poker de Enfermos",
  description: "Aplicación para gestión de torneos de poker - Sistema ELIMINA 2",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Poker Enfermos",
    startupImage: [
      {
        url: "/icons/favicon-512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  icons: {
    icon: [
      { url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/favicon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/favicon-512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Poker Enfermos",
    "application-name": "Poker Enfermos",
    "msapplication-TileColor": "#1f1410",
    "msapplication-TileImage": "/icons/favicon-192.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1f1410"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${cinzel.variable} antialiased noir-bg`}>
        <SWRProvider>
          <AuthProvider>
            <PlayerSearchProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </PlayerSearchProvider>
          </AuthProvider>
        </SWRProvider>
        <NotificationInitializer />
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
