import type { Artist, ArtistDetailResponse, ArtistReleasesResponse, SearchArtistsResponse } from '../types'

export type MusicProvider = 'spotify' | 'deezer'

interface FollowArtistResponse {
  artist: Artist
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function searchArtists(
  query: string,
  limit = 8,
  provider?: MusicProvider,
): Promise<Artist[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  })

  if (provider) {
    params.set('provider', provider)
  }

  const response = await fetch(`/api/search-artists?${params.toString()}`)
  const data = await parseResponse<SearchArtistsResponse>(response)
  return data.artists
}

export async function getArtistReleases(
  artistId: string,
  limit: number | 'all' = 10,
  provider?: MusicProvider,
): Promise<ArtistReleasesResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  })

  if (provider) {
    params.set('provider', provider)
  }

  const response = await fetch(`/api/artists/${artistId}/releases?${params.toString()}`)
  return parseResponse<ArtistReleasesResponse>(response)
}

export async function getArtistDetail(artistId: string, provider?: MusicProvider): Promise<ArtistDetailResponse> {
  const params = new URLSearchParams()

  if (provider) {
    params.set('provider', provider)
  }

  const query = params.toString()
  const endpoint = query ? `/api/artists/${artistId}/detail?${query}` : `/api/artists/${artistId}/detail`
  const response = await fetch(endpoint)
  return parseResponse<ArtistDetailResponse>(response)
}

export async function fetchFollowedArtists(): Promise<Artist[]> {
  const response = await fetch('/api/artists')
  const data = await parseResponse<{ artists: Artist[] }>(response)
  return data.artists
}

export async function followArtist(artist: Artist): Promise<Artist> {
  const response = await fetch('/api/artists/follow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(artist),
  })

  const data = await parseResponse<FollowArtistResponse>(response)
  return data.artist
}

export async function unfollowArtist(artistId: string, provider: MusicProvider): Promise<void> {
  const params = new URLSearchParams({ provider })
  const response = await fetch(`/api/artists/${artistId}/follow?${params.toString()}`, {
    method: 'DELETE',
  })

  await parseResponse<{ unfollowed: boolean }>(response)
}

export async function refreshArtist(artistId: string, provider: MusicProvider): Promise<void> {
  const params = new URLSearchParams({ provider })
  const response = await fetch(`/api/artists/${artistId}/refresh?${params.toString()}`, {
    method: 'POST',
  })

  await parseResponse<{ syncedAt: string }>(response)
}
