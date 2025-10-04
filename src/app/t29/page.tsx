'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lightbulb, MessageSquareText, Users, CheckCircle } from 'lucide-react'
import { ProposalCard } from '@/components/t29/ProposalCard'
import { buildAuthHeaders } from '@/lib/client-auth'
import Link from 'next/link'

interface Proposal {
  id: number
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl?: string | null
}

interface T29Participant {
  id: number
  firstName: string
  lastName: string
  registeredAt: string
  player: {
    id: string
    photoUrl: string | null
  }
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

  const { data, isLoading, error } = useSWR('/api/proposals/public', publicFetcher)
  const { data: participantsData, mutate: mutateParticipants } = useSWR(
    '/api/t29-participants',
    participantsFetcher
  )

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return null
  }

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
        <Card className="bg-gradient-to-br from-[#1f1a2d] via-[#1a1b2a] to-[#141623] border border-white/10 p-5 shadow-[0_18px_40px_rgba(15,15,45,0.35)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-poker-red/30 ring-1 ring-poker-red/40">
                <Users className="w-7 h-7 text-white drop-shadow" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Participación T29</h2>
                <p className="text-sm text-white/60">
                  {participantsCount} {participantsCount === 1 ? 'participante registrado' : 'participantes registrados'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isParticipationConfirmed ? (
                <Button
                  variant="ghost"
                  disabled
                  className="min-w-[220px] rounded-full bg-gradient-to-r from-neutral-700 to-neutral-700/70 text-neutral-200 font-semibold cursor-not-allowed shadow-none"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmada Participación
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleRegisterParticipation}
                  disabled={isRegistering}
                  className="relative min-w-[220px] rounded-full bg-gradient-to-r from-poker-red via-[#d73552] to-[#ff4b2b] text-white font-semibold shadow-[0_14px_30px_rgba(215,53,82,0.45)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(215,53,82,0.55)]"
                >
                  {isRegistering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/80 mr-2"></div>
                      REGISTRANDO...
                    </>
                  ) : (
                    'QUIERO PARTICIPAR'
                  )}
                </Button>
              )}

              {registrationMessage && (
                <p className={`text-sm text-center ${
                  registrationMessage.includes('Error') ? 'text-red-400' : 'text-green-400'
                }`}>
                  {registrationMessage}
                </p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Propuestas T29</h1>
            <p className="text-sm text-white/55 text-center">Vota y comenta las propuestas</p>
          </div>

          {/* Comments Overview Button */}
          <Link href="/t29/comentarios">
            <Button
              variant="ghost"
              className="flex-shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition-all hover:border-poker-red/60 hover:text-white hover:bg-poker-red/20"
            >
              Ver Comentarios
            </Button>
          </Link>
        </header>

        {isLoading && (
          <Card className="admin-card p-7 text-center text-white/60 border-white/15 bg-gradient-to-r from-white/10 via-transparent to-transparent">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red mx-auto mb-4"></div>
            Cargando propuestas...
          </Card>
        )}

        {error && (
          <Card className="admin-card p-7 text-center text-poker-red border-white/15 bg-gradient-to-r from-rose-500/10 via-transparent to-transparent">
            {(error as Error).message}
          </Card>
        )}

        {!isLoading && !error && proposals.length === 0 && (
          <Card className="admin-card p-7 text-center text-white/60 border-white/15 bg-gradient-to-br from-[#1b1d2f] via-[#18192d] to-[#131422]">
            <Lightbulb className="w-10 h-10 mx-auto mb-3 text-poker-red" />
            <h3 className="text-base font-semibold mb-1 text-white">Aún no hay propuestas</h3>
            <p className="text-sm text-white/55">Las propuestas aparecerán aquí cuando sean activadas por la comisión.</p>
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
              />
            ))}
          </div>
        )}
      </section>

      {/* Final explanatory text */}
      <section className="mt-8">
        <Card className="bg-gradient-to-br from-[#17192b] via-[#141626] to-[#10111b] border-white/10 p-5 shadow-[0_18px_40px_rgba(11,12,32,0.35)]">
          <p className="text-white/65 text-sm leading-relaxed text-center">
            Las propuestas aquí presentadas serán posteriormente analizadas por la Comisión y de acuerdo a su aceptación sometidas a votación final por parte del Grupo.
          </p>
        </Card>
      </section>
    </div>
  )
}
