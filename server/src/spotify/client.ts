import { spotifyConfig } from './config.js'
import { getSpotifyAccessToken } from './tokenService.js'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getSpotifyAccessToken()

  const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Spotify API error ${response.status}: ${details}`)
  }

  return response.json() as Promise<T>
}

interface SpotifySearchResponse {
  artists: {
    items: Array<{
      id: string
      name: string
      genres: string[]
      images: Array<{ url: string }>
      external_urls: { spotify: string }
    }>
  }
}

interface SpotifyArtistReleasesResponse {
  items: Array<{
    id: string
    name: string
    album_type: 'album' | 'single' | 'compilation'
    release_date: string
    release_date_precision: 'year' | 'month' | 'day'
    total_tracks: number
    images: Array<{ url: string }>
    external_urls: { spotify: string }
    artists: Array<{
      id: string
      name: string
    }>
  }>
}

export async function searchSpotifyArtists(query: string, limit: number) {
  const encodedQuery = encodeURIComponent(query)
  const data = await spotifyFetch<SpotifySearchResponse>(
    `/search?q=${encodedQuery}&type=artist&limit=${limit}&market=${spotifyConfig.market}`,
  )

  return data.artists.items
}

export async function fetchSpotifyArtistReleases(artistId: string, limit: number) {
  return spotifyFetch<SpotifyArtistReleasesResponse>(
    `/artists/${artistId}/albums?include_groups=album,single,compilation&market=${spotifyConfig.market}&limit=${limit}`,
  )
}
