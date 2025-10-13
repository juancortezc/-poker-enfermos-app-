'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/card'
import { Lightbulb, Users, CheckCircle } from 'lucide-react'
import { ProposalCard } from '@/components/t29/ProposalCard'
import { T29ParticipantsModal, type T29Participant } from '@/components/t29/T29ParticipantsModal'
import { buildAuthHeaders } from '@/lib/client-auth'
import { NoirButton } from '@/components/noir/NoirButton'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Proposal {
  id: number
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl?: string | null
  votingClosed: boolean
}

interface T29ParticipantsResponse {
  participants: T29Participant[]
  count: number
}

const publicFetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('No se pudieron cargar las propuestas activas')
  }
  return response.json() as Promise<{ proposals: Proposal[] }>
}

const participantsFetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('No se pudieron cargar los participantes')
  }
  return response.json() as Promise<T29ParticipantsResponse>
}

export default function T29Page() {
  const { user, loading } = useAuth()
  const [activeProposalId, setActiveProposalId] = useState<number | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [hasRegistered, setHasRegistered] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState<string>('')
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)

  const { data, isLoading, error } = useSWR('/api/proposals/public', publicFetcher)
  const {
    data: participantsData,
    mutate: mutateParticipants,
    isLoading: participantsLoading
  } = useSWR(
    '/api/t29-participants',
    participantsFetcher
  )

  const proposals = data?.proposals ?? []
  const participants = participantsData?.participants ?? []
  const participantsCount = participantsData?.count ?? 0

  // Verificar si el usuario actual ya está registrado
  const isUserRegistered = user ? participants.some(p => p.player.id === user.id) : false
  const isParticipationConfirmed = isUserRegistered || hasRegistered

  useEffect(() => {
    if (isUserRegistered) {
      setHasRegistered(true)
    }
  }, [isUserRegistered])

  useEffect(() => {
    if (!user) {
      setHasRegistered(false)
    }
  }, [user])

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return null
  }

  const toggleProposal = (proposalId: number) => {
    setActiveProposalId((current) => (current === proposalId ? null : proposalId))
  }

  const handleRegisterParticipation = async () => {
    if (!user || isRegistering) return

    setIsRegistering(true)
    setRegistrationMessage('')

    try {
      const response = await fetch('/api/t29-participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        }
      })

      if (response.ok) {
        const result = await response.json()
        setRegistrationMessage(result.message)
        setHasRegistered(true)
        await mutateParticipants() // Actualizar la lista de participantes
      } else {
        const error = await response.json()
        setRegistrationMessage(error.error || 'Error al registrar participación')

        if (response.status === 409) {
          // Ya está registrado; aseguremos el estado local
          setHasRegistered(true)
          await mutateParticipants()
        }
      }
    } catch (error) {
      console.error('Error registering participation:', error)
      setRegistrationMessage('Error de conexión')
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="pb-24 space-y-6">
      {/* Sección de Participación T29 */}
      <section className="relative">
        <Card className="noir-card border border-[#e0b66c]/18 bg-[rgba(24,14,10,0.92)] p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 rounded-3xl border border-[#e0b66c]/15 bg-[rgba(31,20,16,0.78)] px-4 py-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-[#e0b66c]/35 bg-[rgba(42,26,20,0.75)] text-[#e0b66c] shadow-[0_12px_28px_rgba(11,6,3,0.55)]">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <h2 className="font-heading text-lg uppercase tracking-[0.22em] text-[#f3e6c5]">
                  Participación T29
                </h2>
                <p className="text-sm text-[#d7c59a]/75">
                  {participantsCount} {participantsCount === 1 ? 'participante registrado' : 'participantes registrados'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {participantsCount > 0 && (
                <NoirButton
                  onClick={() => {
                    setShowParticipantsModal(true)
                    setShowParticipantsModal(true)
                  }}
                  variant="secondary"
                  className="min-w-[180px] justify-center"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Ver Registrados
                </NoirButton>
              )}
              {isParticipationConfirmed ? (
                <NoirButton
                  variant="secondary"
                  disabled
                  className="min-w-[220px] cursor-not-allowed opacity-80"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmada Participación
                </NoirButton>
              ) : (
                <NoirButton
                  onClick={handleRegisterParticipation}
                  disabled={isRegistering}
                  className="relative min-w-[220px] justify-center"
                >
                  {isRegistering ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-[#1f1410]/60"></div>
                      REGISTRANDO...
                    </>
                  ) : (
                    'QUIERO PARTICIPAR'
                  )}
                </NoirButton>
              )}

              {registrationMessage && (
                <p
                  className={cn(
                    'text-center text-sm',
                    registrationMessage.includes('Error') ? 'text-[#f38b7d]' : 'text-[#7bdba5]'
                  )}
                >
                  {registrationMessage}
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <header className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex-1 space-y-1">
            <h1 className="font-heading text-2xl uppercase tracking-[0.22em] text-[#f3e6c5]">
              Propuestas T29
            </h1>
            <p className="text-sm text-[#d7c59a]/70">
              Revisa, comenta y vota las ideas de la comisión Noir Jazz
            </p>
          </div>

          {/* Comments Overview Button */}
          <NoirButton
            asChild
            variant="ghost"
            size="sm"
            className="flex-shrink-0 px-4 py-2 text-[10px]"
          >
            <Link href="/t29/comentarios">Ver comentarios</Link>
          </NoirButton>
        </header>

        {isLoading && (
          <Card className="paper flex flex-col items-center gap-3 px-6 py-8 text-[#d7c59a]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e0b66c] border-t-transparent" />
            <span>Cargando propuestas...</span>
          </Card>
        )}

        {error && (
          <Card className="paper px-6 py-8 text-center text-[#f38b7d]">
            {(error as Error).message}
          </Card>
        )}

        {!isLoading && !error && proposals.length === 0 && (
          <Card className="paper px-6 py-10 text-center text-[#d7c59a]">
            <Lightbulb className="mx-auto mb-3 h-10 w-10 text-[#e0b66c]" />
            <h3 className="font-heading text-base uppercase tracking-[0.2em] text-[#f3e6c5]">
              Aún no hay propuestas
            </h3>
            <p className="mt-2 text-sm text-[#d7c59a]/70">
              Las propuestas aparecerán aquí cuando la comisión active la fase de votación.
            </p>
          </Card>
        )}

        {/* 2x2 Grid Layout for Proposals */}
        {!isLoading && !error && proposals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                isExpanded={activeProposalId === proposal.id}
                onToggle={() => toggleProposal(proposal.id)}
                votingClosed={proposal.votingClosed}
              />
            ))}
          </div>
        )}
      </section>

      <T29ParticipantsModal
        isOpen={showParticipantsModal}
        onClose={() => setShowParticipantsModal(false)}
        participants={participants}
        isLoading={participantsLoading}
        totalCount={participantsCount}
      />
    </div>
  )
}
