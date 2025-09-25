import EnfermoDetail from '@/components/enfermos/EnfermoDetail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EnfermoDetailPage({ params }: PageProps) {
  const { id } = await params
  return <EnfermoDetail playerId={id} />
}

export const metadata = {
  title: 'Perfil de Enfermo - Poker de Enfermos',
  description: 'Detalle de jugador'
}
