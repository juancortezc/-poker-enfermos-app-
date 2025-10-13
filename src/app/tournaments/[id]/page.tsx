'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function TournamentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tournamentId = params.id

  useEffect(() => {
    // Redirect to edit page immediately
    router.replace(`/tournaments/${tournamentId}/edit`)
  }, [router, tournamentId])

  return null
}
