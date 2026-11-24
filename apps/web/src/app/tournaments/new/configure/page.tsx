import TournamentForm from '@/components/tournaments/TournamentForm'

interface PageProps {
  searchParams: Promise<{ number?: string; calendarDraft?: string }>
}

export default async function ConfigureTournament({ searchParams }: PageProps) {
  const params = await searchParams
  const initialTournamentNumber = params.number ? parseInt(params.number) : undefined
  const useCalendarDraft = params.calendarDraft === '1'
  
  return (
    <TournamentForm
      initialTournamentNumber={initialTournamentNumber}
      useCalendarDraft={useCalendarDraft}
    />
  )
}

export const metadata = {
  title: 'Configurar Torneo - Poker de Enfermos',
  description: 'Configurar nuevo torneo'
}
