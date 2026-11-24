import { NextResponse } from 'next/server'

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
export async function GET() {
  try {
    // Use Spotify oEmbed to get podcast info
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(SPOTIFY_SHOW_URL)}`

    const response = await fetch(oembedUrl)

    if (!response.ok) {
      throw new Error('Failed to fetch podcast info from Spotify')
    }

    const data: SpotifyOEmbedResponse = await response.json()

    return NextResponse.json({
      showId: SPOTIFY_SHOW_ID,
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      spotifyUrl: SPOTIFY_SHOW_URL,
      embedHtml: data.html,
      provider: data.provider_name
    })
  } catch (error) {
    console.error('Error fetching podcast info:', error)
    return NextResponse.json(
      { error: 'Error fetching podcast info' },
      { status: 500 }
    )
  }
}
