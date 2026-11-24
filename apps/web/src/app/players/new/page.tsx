import PlayerFormPage from '@/components/players/PlayerFormPage'
import InvitadoFormPage from '@/components/players/InvitadoFormPage'

interface NewPlayerPageProps {
  searchParams: Promise<{ type?: string }>
}

export default async function NewPlayerPage({ searchParams }: NewPlayerPageProps) {
  const { type } = await searchParams
  
  if (type === 'invitado') {
    return <InvitadoFormPage />
  }
  
  return <PlayerFormPage />
}

export const metadata = {
  title: 'Nuevo Jugador - Poker Enfermos',
  description: 'Agregar nuevo jugador al grupo'
}