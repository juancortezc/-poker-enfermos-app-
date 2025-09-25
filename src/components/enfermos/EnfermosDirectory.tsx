'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { buildAuthHeaders } from '@/lib/client-auth'
import { UserRole } from '@prisma/client'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  aliases: string[]
  photoUrl?: string | null
  isActive: boolean
  joinYear?: number | null
}

export default function EnfermosDirectory() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPlayers = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/players?includeInactive=false', {
          headers: buildAuthHeaders()
        })
        if (!response.ok) {
          throw new Error('No se pudo cargar jugadores')
        }
        const data: Player[] = await response.json()
        setPlayers(data)
      } catch (error) {
        console.error('Error fetching players:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [])

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filterFn = (player: Player) => {
      if (!term) return true
      return (
        player.firstName.toLowerCase().includes(term) ||
        player.lastName.toLowerCase().includes(term) ||
        player.aliases.some(alias => alias.toLowerCase().includes(term))
      )
    }

    const enfermos = players
      .filter(player => (player.role === 'Enfermo' || player.role === 'Comision') && player.isActive)
      .filter(filterFn)
      .sort((a, b) => a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' }))

    return enfermos
  }, [players, search])

  const renderPlayerCard = (player: Player) => {
    const initials = `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase()

    return (
      <button
        key={player.id}
        onClick={() => router.push(`/admin/enfermos/${player.id}`)}
        className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-left transition-all hover:-translate-y-1 hover:border-poker-red/50 hover:bg-black/60"
      >
        <div
          className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-poker-red/40 to-black/40"
        >
          {player.photoUrl ? (
            <Image
              src={player.photoUrl}
              alt={`${player.firstName} ${player.lastName}`}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
              {initials || '??'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {player.firstName}
          </p>
          <p className="truncate text-xs text-white/50">{player.lastName}</p>
        </div>
        <span className="text-xs text-white/40 transition-colors group-hover:text-poker-red">Ver</span>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark pb-safe">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center text-sm text-white/60">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-poker-red" />
          Cargando directorio...
        </div>
      </div>
    )
  }

  const emptyState = filteredPlayers.length === 0

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <header className="space-y-4">
          <h1 className="text-2xl font-bold text-white">Directorio de Enfermos</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o alias"
              className="h-11 rounded-xl border-white/10 bg-black/40 pl-10 text-sm text-white placeholder:text-white/40"
            />
          </div>
        </header>

        {emptyState ? (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/60">
            No encontramos jugadores con ese nombre.
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">Enfermos</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {filteredPlayers.map(renderPlayerCard)}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
