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
  next: string | null
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

interface SpotifyArtistDetailResponse {
  id: string
  name: string
  genres: string[]
  images: Array<{ url: string }>
  external_urls: { spotify: string }
}

const SPOTIFY_PAGE_LIMIT = 50
const MAX_SPOTIFY_RELEASES = Number(process.env.SPOTIFY_MAX_RELEASES ?? 500)

export async function searchSpotifyArtists(query: string, limit: number) {
  const encodedQuery = encodeURIComponent(query)
  const data = await spotifyFetch<SpotifySearchResponse>(
    `/search?q=${encodedQuery}&type=artist&limit=${limit}&market=${spotifyConfig.market}`,
  )

  return data.artists.items
}

export async function fetchSpotifyArtistReleases(artistId: string, limit: number) {
  const requested = Math.min(Math.max(limit, 1), MAX_SPOTIFY_RELEASES)
  const items: SpotifyArtistReleasesResponse['items'] = []
  let offset = 0

  while (items.length < requested) {
    const pageLimit = Math.min(SPOTIFY_PAGE_LIMIT, requested - items.length)
    const page = await spotifyFetch<SpotifyArtistReleasesResponse>(
      `/artists/${artistId}/albums?include_groups=album,single,compilation&market=${spotifyConfig.market}&limit=${pageLimit}&offset=${offset}`,
    )

    items.push(...page.items)

    if (!page.next || page.items.length === 0) {
      break
    }

    offset += page.items.length
  }

  return items
}

export async function fetchAllSpotifyArtistReleases(artistId: string) {
  return fetchSpotifyArtistReleases(artistId, MAX_SPOTIFY_RELEASES)
}

export async function fetchSpotifyArtistDetail(artistId: string) {
  return spotifyFetch<SpotifyArtistDetailResponse>(`/artists/${artistId}`)
}
