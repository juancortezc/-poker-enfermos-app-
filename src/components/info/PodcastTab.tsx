'use client'

import { useState, useEffect } from 'react'
import { Mic, ExternalLink, Headphones } from 'lucide-react'

interface PodcastInfo {
  showId: string
  title: string
  thumbnailUrl: string
  spotifyUrl: string
  provider: string
}

// Spotify Show ID for "Poker de enfermos"
const SPOTIFY_SHOW_ID = '0sZ6ae5UAYUOD45MFa9PcH'

export default function PodcastTab() {
  const [podcastInfo, setPodcastInfo] = useState<PodcastInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPodcastInfo()
  }, [])

  const fetchPodcastInfo = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/podcast')

      if (!response.ok) {
        throw new Error('Error al cargar podcast')
      }

      const data = await response.json()
      setPodcastInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando podcast...</div>
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
          onClick={fetchPodcastInfo}
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
      {/* Header Card */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1DB954, #1ed760)' }}
          >
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2
              className="font-bold"
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface)',
              }}
            >
              {podcastInfo?.title || 'Poker de enfermos'}
            </h2>
            <p
              style={{
                fontSize: 'var(--cp-caption-size)',
                color: 'var(--cp-on-surface-muted)',
              }}
            >
              Podcast oficial del grupo
            </p>
          </div>
        </div>

        {/* Description */}
        <p
          className="mb-4"
          style={{
            fontSize: 'var(--cp-caption-size)',
            color: 'var(--cp-on-surface-variant)',
          }}
        >
          Escucha nuestro podcast donde hablamos de poker, estrategias, y anecdotas del grupo.
        </p>

        {/* Open in Spotify Button */}
        <a
          href={podcastInfo?.spotifyUrl || `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-90"
          style={{
            background: '#1DB954',
            color: 'white',
            fontSize: 'var(--cp-body-size)',
          }}
        >
          <Headphones className="w-5 h-5" />
          Abrir en Spotify
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Spotify Embed Player */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <iframe
          src={`https://open.spotify.com/embed/show/${SPOTIFY_SHOW_ID}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          style={{
            borderRadius: '12px',
            background: 'transparent',
          }}
        />
      </div>

      {/* Tip */}
      <div
        className="rounded-xl p-3 text-center"
        style={{
          background: 'rgba(29, 185, 84, 0.1)',
          border: '1px solid rgba(29, 185, 84, 0.2)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--cp-caption-size)',
            color: 'var(--cp-on-surface-variant)',
          }}
        >
          💡 Sigue el podcast en Spotify para recibir nuevos episodios automaticamente
        </p>
      </div>
    </div>
  )
}
