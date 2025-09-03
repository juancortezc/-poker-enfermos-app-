import { notFound } from 'next/navigation'
import TournamentDetails from '@/components/tournaments/TournamentDetails'

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params
  
  if (!id) {
    notFound()
  }

  return <TournamentDetails tournamentId={id} />
}

export const metadata = {
  title: 'Detalle de Torneo - Poker de Enfermos',
  description: 'Ver detalles del torneo'
}