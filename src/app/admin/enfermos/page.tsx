'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Users, HeartPulse } from 'lucide-react'

export default function AdminEnfermosPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="text-white/60">Cargando enfermos...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="text-red-400">Acceso no autorizado</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">En desarrollo</p>
              <h1 className="mt-2 text-2xl font-bold text-white">Enfermos</h1>
              <p className="mt-1 text-sm text-white/70 max-w-md">
                Estamos construyendo una sección dedicada con perfiles, historias y data especial de cada enfermo.
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
              <HeartPulse className="h-6 w-6 text-poker-red" />
            </div>
          </div>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-poker-red to-poker-orange text-white shadow-[0_5px_25px_rgba(229,9,20,0.35)]">
            <Users className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white">Muy pronto</h2>
          <p className="mt-2 text-sm text-white/70">
            Aquí verás el estado de cada enfermo, sus últimas apariciones y la conexión con el Club 1000.
          </p>
        </div>
      </div>
    </div>
  )
}
