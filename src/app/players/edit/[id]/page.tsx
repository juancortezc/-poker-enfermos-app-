import { notFound } from 'next/navigation'
import PlayerFormPage from '@/components/players/PlayerFormPage'

interface PlayerEditPageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerEditPage({ params }: PlayerEditPageProps) {
  const { id } = await params
  
  if (!id) {
    notFound()
  }

  return <PlayerFormPage playerId={id} />
}

export const metadata = {
  title: 'Editar Jugador - Poker Enfermos',
  description: 'Editar información del jugador'
}