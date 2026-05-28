const DEEZER_API_BASE = 'https://api.deezer.com'

interface DeezerSearchResponse {
  data: Array<{
    id: number
    name: string
    picture?: string
    picture_medium?: string
    picture_big?: string
    picture_xl?: string
    link: string
  }>
}

interface DeezerArtistAlbumsResponse {
  data: Array<{
    id: number
    title: string
    link: string
    cover?: string
    cover_medium?: string
    cover_big?: string
    cover_xl?: string
    release_date?: string
    record_type?: string
    nb_tracks?: number
    artist?: {
      id: number
      name: string
    }
  }>
}

function parseReleaseDatePrecision(date: string | undefined): 'year' | 'month' | 'day' {
  if (!date) {
    return 'day'
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return 'day'
  }

  if (/^\d{4}-\d{2}$/.test(date)) {
    return 'month'
  }

  if (/^\d{4}$/.test(date)) {
    return 'year'
  }

  return 'day'
}

function normalizeRecordType(value: string | undefined): 'album' | 'single' | 'compilation' {
  if (value === 'single') {
    return 'single'
  }

  if (value === 'album') {
    return 'album'
  }

  return 'compilation'
}

async function deezerFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${DEEZER_API_BASE}${path}`)

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Deezer API error ${response.status}: ${details}`)
  }

  return response.json() as Promise<T>
}

export async function searchDeezerArtists(query: string, limit: number) {
  const encodedQuery = encodeURIComponent(query)
  const data = await deezerFetch<DeezerSearchResponse>(`/search/artist?q=${encodedQuery}&limit=${limit}`)

  return data.data.map((artist) => ({
    id: String(artist.id),
    name: artist.name,
    genres: [] as string[],
    imageUrl: artist.picture_xl ?? artist.picture_big ?? artist.picture_medium ?? artist.picture,
    externalUrl: artist.link,
  }))
}

export async function fetchDeezerArtistReleases(artistId: string, limit: number) {
  const data = await deezerFetch<DeezerArtistAlbumsResponse>(
    `/artist/${encodeURIComponent(artistId)}/albums?limit=${limit}`,
  )

  return data.data.map((item) => ({
    id: String(item.id),
    artistId: String(item.artist?.id ?? artistId),
    artistName: item.artist?.name ?? 'Unknown artist',
    title: item.title,
    type: normalizeRecordType(item.record_type),
    releaseDate: item.release_date ?? '1970-01-01',
    releaseDatePrecision: parseReleaseDatePrecision(item.release_date),
    coverUrl: item.cover_xl ?? item.cover_big ?? item.cover_medium ?? item.cover ?? '',
    externalUrl: item.link,
    totalTracks: item.nb_tracks ?? 0,
  }))
}
