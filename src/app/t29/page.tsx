'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lightbulb, MessageSquareText, Users, CheckCircle } from 'lucide-react'
import { ProposalCard } from '@/components/t29/ProposalCard'
import Link from 'next/link'

interface Proposal {
  id: number
  title: string
  content: string
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
          'Authorization': `Bearer ${user.adminKey}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setRegistrationMessage(result.message)
        mutateParticipants() // Actualizar la lista de participantes
      } else {
        const error = await response.json()
        setRegistrationMessage(error.error || 'Error al registrar participación')
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
        <Card className="bg-gradient-to-r from-poker-red/20 to-poker-red/10 border-poker-red/30 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-poker-red/30">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Participación T29</h2>
                <p className="text-sm text-white/70">
                  {participantsCount} {participantsCount === 1 ? 'participante registrado' : 'participantes registrados'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {isUserRegistered ? (
                <Button
                  disabled
                  className="bg-green-600/20 text-green-300 border border-green-600/30 cursor-not-allowed min-w-[200px]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  YA ESTÁS REGISTRADO
                </Button>
              ) : (
                <Button
                  onClick={handleRegisterParticipation}
                  disabled={isRegistering}
                  className="bg-poker-red hover:bg-poker-red/80 text-white font-semibold min-w-[200px]"
                >
                  {isRegistering ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      REGISTRANDO...
                    </>
                  ) : (
                    'SI VOY A PARTICIPAR'
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
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Propuestas T29</h1>
              <p className="text-sm text-white/60">Vota y comenta las propuestas para el torneo</p>
            </div>
          </div>

          {/* Comments Overview Button */}
          <Link href="/t29/comentarios">
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm px-3 py-2 flex-shrink-0">
              <MessageSquareText className="w-4 h-4 mr-1" />
              Ver Comentarios
            </Button>
          </Link>
        </header>

        {isLoading && (
          <Card className="admin-card p-8 text-center text-white/60">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red mx-auto mb-4"></div>
            Cargando propuestas...
          </Card>
        )}

        {error && (
          <Card className="admin-card p-8 text-center text-poker-red">
            {(error as Error).message}
          </Card>
        )}

        {!isLoading && !error && proposals.length === 0 && (
          <Card className="admin-card p-8 text-center text-white/60">
            <Lightbulb className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <h3 className="text-lg font-semibold mb-2 text-white">Aún no hay propuestas</h3>
            <p className="text-white/60">Las propuestas aparecerán aquí cuando sean activadas por la comisión.</p>
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
        <Card className="bg-gradient-to-r from-gray-800/20 to-gray-700/10 border-gray-600/30 p-6">
          <p className="text-white/70 text-sm leading-relaxed text-center">
            Las propuestas aquí presentadas serán posteriormente analizadas por la Comisión y de acuerdo a su aceptación sometidas a votación final por parte del Grupo.
          </p>
        </Card>
      </section>
    </div>
  )
}
