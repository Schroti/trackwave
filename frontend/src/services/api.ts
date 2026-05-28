import type { Artist, ArtistReleasesResponse, SearchArtistsResponse } from '../types'

export type MusicProvider = 'spotify' | 'deezer'

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
  limit = 10,
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
