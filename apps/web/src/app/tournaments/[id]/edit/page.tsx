import CPEditarTorneo from '@/components/tournaments/CPEditarTorneo'

interface PageProps {
  params: Promise<{ id: string }>
}

// Editar un torneo creado: nombre, inscritos y calendario (Comisión).
export default async function EditTournamentPage({ params }: PageProps) {
  const { id } = await params
  return <CPEditarTorneo tournamentId={id} />
}

export const metadata = {
  title: 'Editar Torneo - Poker de Enfermos',
  description: 'Editar inscritos y calendario del torneo'
}
