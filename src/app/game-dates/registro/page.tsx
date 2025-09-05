import { Metadata } from 'next'

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-poker-dark text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Registro de Fecha</h1>
        <p className="text-poker-muted">
          Funcionalidad de registro en desarrollo...
        </p>
      </div>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'Registro - Poker de Enfermos',
  description: 'Registro de participantes en fecha activa'
}