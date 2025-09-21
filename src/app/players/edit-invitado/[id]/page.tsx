import { notFound } from 'next/navigation'
import InvitadoFormPage from '@/components/players/InvitadoFormPage'

interface InvitadoEditPageProps {
  params: Promise<{ id: string }>
}

export default async function InvitadoEditPage({ params }: InvitadoEditPageProps) {
  const { id } = await params
  
  if (!id) {
    notFound()
  }

  return <InvitadoFormPage invitadoId={id} />
}

export const metadata = {
  title: 'Editar Invitado - Poker Enfermos',
  description: 'Editar información del invitado'
}