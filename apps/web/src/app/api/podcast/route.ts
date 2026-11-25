import { AppError, withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

export const dynamic = 'force-dynamic'

// Spotify Show ID for "Poker de enfermos"
const SPOTIFY_SHOW_ID = '0sZ6ae5UAYUOD45MFa9PcH'
const SPOTIFY_SHOW_URL = `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`

interface SpotifyOEmbedResponse {
  title: string
  type: string
  thumbnail_url: string
  thumbnail_width: number
  thumbnail_height: number
  html: string
  width: number
  height: number
  provider_name: string
  provider_url: string
}

// GET /api/podcast - Get podcast info and embed
export const GET = withErrorHandler(async () => {
  // Use Spotify oEmbed to get podcast info
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(SPOTIFY_SHOW_URL)}`

  const response = await fetch(oembedUrl)

  if (!response.ok) {
    throw AppError.internal('No se pudo obtener el podcast de Spotify', 'PODCAST_UNAVAILABLE')
  }

  const data: SpotifyOEmbedResponse = await response.json()

  return ok({
    showId: SPOTIFY_SHOW_ID,
    title: data.title,
    thumbnailUrl: data.thumbnail_url,
    spotifyUrl: SPOTIFY_SHOW_URL,
    embedHtml: data.html,
    provider: data.provider_name
  })
})
