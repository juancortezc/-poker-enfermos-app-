import TournamentForm from '@/components/tournaments/TournamentForm'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function EditTournamentPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams

  return (
    <TournamentForm
      tournamentId={id}
    />
  )
}

export const metadata = {
  title: 'Editar Torneo - Poker de Enfermos',
  description: 'Editar configuración del torneo'
}
