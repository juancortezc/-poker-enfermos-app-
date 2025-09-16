'use client'

import InvitadoFormPage from '@/components/players/InvitadoFormPage'

export default function EditInvitadoPage({ params }: { params: { id: string } }) {
  return <InvitadoFormPage invitadoId={params.id} />
}