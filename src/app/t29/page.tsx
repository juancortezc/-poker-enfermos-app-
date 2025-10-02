'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { buildAuthHeaders } from '@/lib/client-auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Lightbulb, MessageSquareText } from 'lucide-react'
import { ProposalCard } from '@/components/t29/ProposalCard'
import Link from 'next/link'

interface Proposal {
  id: number
  title: string
  content: string
  imageUrl?: string | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { headers: buildAuthHeaders() })
  if (!response.ok) {
    throw new Error('No se pudieron cargar las propuestas activas')
  }
  return response.json() as Promise<{ proposals: Proposal[] }>
}

export default function T29Page() {
  const { user, loading } = useAuth()
  const [activeProposalId, setActiveProposalId] = useState<number | null>(null)
  const { data, isLoading, error } = useSWR(user ? '/api/proposals' : null, fetcher)

  if (loading) {
    return <LoadingState />
  }

  if (!user) {
    return null
  }

  const proposals = data?.proposals ?? []

  const toggleProposal = (proposalId: number) => {
    setActiveProposalId((current) => (current === proposalId ? null : proposalId))
  }

  return (
    <div className="pb-24 space-y-6">
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
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
              <MessageSquareText className="w-4 h-4 mr-2" />
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
    </div>
  )
}
