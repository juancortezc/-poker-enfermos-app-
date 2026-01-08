'use client'

interface AppLayoutProps {
  children: React.ReactNode
  fullWidth?: boolean
}

// AppLayout now simply passes children through
// All pages use CleanPoker design system and handle their own layout
export function AppLayout({ children }: AppLayoutProps) {
  return <>{children}</>
}
