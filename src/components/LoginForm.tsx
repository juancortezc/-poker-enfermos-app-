'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { KeyRound, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginForm() {
  const [adminKey, setAdminKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const success = await login(adminKey)
    
    if (!success) {
      setError('Clave de acceso inválida')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-poker-dark p-4">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PHBhdGggZD0iTTM2IDM0djItaDZ2LTJ6bTAgMHYtMmgtNnYyem0wLTEwaC02djJ6bTAgMGg2di0yem0tMTAgMTB2Mmg2di0yem0wIDB2LTJoLTZ2MnptMC0xMGgtNnYyem0wIDBoNnYtMnoiIGZpbGw9IiMyNDI0MjQiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')] opacity-30" />
      
      <Card className="w-full max-w-md bg-poker-card border-poker-red/20 shadow-2xl animate-enter relative z-10">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32 bg-poker-dark rounded-full p-2 shadow-inner">
              <Image
                src="https://storage.googleapis.com/poker-enfermos/logo.png"
                alt="Poker Enfermos Logo"
                width={120}
                height={120}
                className="w-full h-full object-contain filter drop-shadow-lg"
                priority
              />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-poker-text mb-2">
              Poker Enfermos
            </h1>
            <p className="text-poker-muted text-sm">
              Ingresa tu clave de acceso para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-poker-muted" />
              </div>
              <Input
                type="text"
                placeholder="Clave de acceso"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                disabled={loading}
                className="w-full pl-10 h-12 bg-poker-dark/50 border-poker-red/30 text-poker-text placeholder:text-poker-muted focus:border-poker-red focus:ring-poker-red/30 transition-smooth"
                autoComplete="off"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Botón */}
            <Button
              type="submit"
              disabled={loading || !adminKey}
              className="w-full h-12 btn-enhanced text-white font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-poker-muted text-xs">
              © 2025 Poker Enfermos. Todos los derechos reservados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}