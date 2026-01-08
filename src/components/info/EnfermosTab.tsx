'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Users, Mail, Phone, Cake, Pencil } from 'lucide-react'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: string
  aliases: string[]
  photoUrl?: string | null
  isActive: boolean
  joinYear?: number | null
  email?: string | null
  phone?: string | null
  birthDate?: string | null
}

export default function EnfermosTab() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/players?includeInactive=false')

      if (!response.ok) {
        throw new Error('Error al cargar jugadores')
      }

      const data: Player[] = await response.json()
      setPlayers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()

    const enfermos = players
      .filter(player => (player.role === 'Enfermo' || player.role === 'Comision') && player.isActive)
      .filter(player => {
        if (!term) return true
        return (
          player.firstName.toLowerCase().includes(term) ||
          player.lastName.toLowerCase().includes(term) ||
          player.aliases.some(alias => alias.toLowerCase().includes(term))
        )
      })
      .sort((a, b) => {
        // Current user always first
        if (user?.id === a.id) return -1
        if (user?.id === b.id) return 1
        return a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' })
      })

    return enfermos
  }, [players, search, user?.id])

  const formatBirthday = (birthDate: string | null | undefined) => {
    if (!birthDate) return null
    try {
      const dateOnly = birthDate.split('T')[0]
      const date = new Date(dateOnly + 'T12:00:00')
      const day = date.getDate()
      const month = date.toLocaleDateString('es-ES', { month: 'short' })
      return `${day} ${month}`
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando enfermos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)' }}>
          Error: {error}
        </p>
        <button
          onClick={fetchPlayers}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--cp-on-surface-muted)' }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre"
          className="w-full rounded-xl py-3 pl-10 pr-4"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            color: 'var(--cp-on-surface)',
            fontSize: 'var(--cp-body-size)',
          }}
        />
      </div>

      {/* Count */}
      <div className="flex items-center gap-2 px-1">
        <Users className="w-4 h-4" style={{ color: 'var(--cp-on-surface-muted)' }} />
        <span
          className="text-xs"
          style={{ color: 'var(--cp-on-surface-muted)' }}
        >
          {filteredPlayers.length} enfermos activos
        </span>
      </div>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
            No se encontraron jugadores
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlayers.map((player) => {
            const initials = `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase()
            const birthday = formatBirthday(player.birthDate)
            const isCurrentUser = user?.id === player.id

            return (
              <div
                key={player.id}
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--cp-surface)',
                  border: '1px solid var(--cp-surface-border)',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #E53935, #f97316)',
                    }}
                  >
                    {player.photoUrl ? (
                      <Image
                        src={player.photoUrl}
                        alt={`${player.firstName} ${player.lastName}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center text-lg font-semibold"
                        style={{ color: 'white' }}
                      >
                        {initials || '??'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name, Role and Edit Button */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3
                        className="font-bold truncate"
                        style={{
                          fontSize: 'var(--cp-body-size)',
                          color: 'var(--cp-on-surface)',
                        }}
                      >
                        {player.firstName} {player.lastName}
                      </h3>
                      {player.role === 'Comision' && (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                          style={{
                            background: 'rgba(229, 57, 53, 0.2)',
                            color: '#E53935',
                          }}
                        >
                          C
                        </span>
                      )}
                      {isCurrentUser && (
                        <Link
                          href="/perfil-new"
                          className="ml-auto p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/10"
                          style={{ color: '#E53935' }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5">
                      {/* Phone */}
                      {player.phone && (
                        <a
                          href={`tel:${player.phone}`}
                          className="flex items-center gap-2"
                        >
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
                          <span
                            style={{
                              fontSize: 'var(--cp-caption-size)',
                              color: 'var(--cp-on-surface-variant)',
                            }}
                          >
                            {player.phone}
                          </span>
                        </a>
                      )}

                      {/* Email */}
                      {player.email && (
                        <a
                          href={`mailto:${player.email}`}
                          className="flex items-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
                          <span
                            className="truncate"
                            style={{
                              fontSize: 'var(--cp-caption-size)',
                              color: 'var(--cp-on-surface-variant)',
                            }}
                          >
                            {player.email}
                          </span>
                        </a>
                      )}

                      {/* Birthday */}
                      {birthday && (
                        <div className="flex items-center gap-2">
                          <Cake className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
                          <span
                            style={{
                              fontSize: 'var(--cp-caption-size)',
                              color: 'var(--cp-on-surface-variant)',
                            }}
                          >
                            {birthday}
                          </span>
                        </div>
                      )}

                      {/* No contact info message */}
                      {!player.email && !player.phone && !birthday && (
                        <p
                          style={{
                            fontSize: 'var(--cp-caption-size)',
                            color: 'var(--cp-on-surface-muted)',
                          }}
                        >
                          Sin datos de contacto
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
