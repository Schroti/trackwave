const DEEZER_API_BASE = 'https://api.deezer.com'
import {
  getDeezerCachedPayload,
  getDeezerStalePayload,
  setDeezerCachedPayload,
} from '../cache/deezerCache.js'

const DEFAULT_DEEZER_CACHE_TTL_MS = Number(process.env.DEEZER_CACHE_TTL_MS ?? 6 * 60 * 60 * 1000)
const ARTIST_ALBUMS_MAX_AGE_MS = Number(process.env.DEEZER_ARTIST_ALBUMS_MAX_AGE_MS ?? 5 * 60 * 1000)
const MAX_DEEZER_RELEASES = Number(process.env.DEEZER_MAX_RELEASES ?? 500)
const DEEZER_PAGE_LIMIT = 100
const DEEZER_REQUEST_SLOT_MS = 100

let nextAllowedRequestAt = Date.now()

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

interface DeezerApiErrorPayload {
  error?: {
    type?: string
    message?: string
    code?: number
  }
}

interface DeezerTrackSearchResponse {
  data: Array<{
    id: number
    title: string
    artist?: {
      id: number
      name: string
    }
    album?: {
      id: number
      title: string
    }
  }>
}

interface DeezerArtistAlbumsResponse {
  next?: string
  total?: number
  data: Array<{
    id: number
    title: string
    link: string
    cover?: string
    cover_medium?: string
    cover_big?: string
    cover_xl?: string
    md5_image?: string
    release_date?: string
    record_type?: string
    nb_tracks?: number
    artist?: {
      id: number
      name: string
    }
  }>
}

interface DeezerArtistResponse {
  id: number
  name: string
  link: string
  picture?: string
  picture_medium?: string
  picture_big?: string
  picture_xl?: string
}

interface DeezerAlbumDetailResponse {
  id: number
  title: string
  link: string
  cover?: string
  cover_medium?: string
  cover_big?: string
  cover_xl?: string
  md5_image?: string
  release_date?: string
  record_type?: string
  nb_tracks?: number
  artist?: {
    id: number
    name: string
  }
  tracks?: {
    data: Array<{
      title: string
    }>
  }
}

function normalizeTitle(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

async function findOlderTrackDateViaSearch(options: {
  artistId: number
  artistName: string
  title: string
  currentAlbumId: number
  currentReleaseDate: string
  albumDetailCache: Map<number, Promise<DeezerAlbumDetailResponse>>
}): Promise<string | undefined> {
  const { artistId, artistName, title, currentAlbumId, currentReleaseDate, albumDetailCache } = options
  const query = encodeURIComponent(`artist:"${artistName}" track:"${title}"`)
  const search = await deezerFetch<DeezerTrackSearchResponse>(`/search/track?q=${query}&limit=12`)

  const candidateAlbumIds = Array.from(
    new Set(
      search.data
        .filter((item) => item.artist?.id === artistId && item.album?.id && item.album.id !== currentAlbumId)
        .map((item) => item.album!.id),
    ),
  ).slice(0, 8)

  let oldestDate: string | undefined

  for (const albumId of candidateAlbumIds) {
    let detailsPromise = albumDetailCache.get(albumId)

    if (!detailsPromise) {
      detailsPromise = deezerFetch<DeezerAlbumDetailResponse>(`/album/${albumId}`)
      albumDetailCache.set(albumId, detailsPromise)
    }

    const details = await detailsPromise
    const releaseDate = details.release_date

    if (!releaseDate) {
      continue
    }

    if (Date.parse(releaseDate) >= Date.parse(currentReleaseDate)) {
      continue
    }

    if (!oldestDate || Date.parse(releaseDate) < Date.parse(oldestDate)) {
      oldestDate = releaseDate
    }
  }

  return oldestDate
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

  if (value === 'ep') {
    return 'single'
  }

  if (value === 'album') {
    return 'album'
  }

  return 'compilation'
}

function buildDeezerCoverUrl(md5: string | undefined, size = 1000): string {
  if (!md5) {
    return ''
  }

  return `https://e-cdns-images.dzcdn.net/images/cover/${md5}/${size}x${size}-000000-80-0-0.jpg`
}

function resolveArtistImage(artist: DeezerArtistResponse): string | undefined {
  return artist.picture_xl ?? artist.picture_big ?? artist.picture_medium ?? artist.picture
}

function resolveCoverUrl(
  details: Pick<DeezerAlbumDetailResponse, 'cover_xl' | 'cover_big' | 'cover_medium' | 'cover' | 'md5_image'>,
  item: Pick<
    DeezerArtistAlbumsResponse['data'][number],
    'cover_xl' | 'cover_big' | 'cover_medium' | 'cover' | 'md5_image'
  >,
): string {
  return (
    details.cover_xl ||
    details.cover_big ||
    details.cover_medium ||
    details.cover ||
    buildDeezerCoverUrl(details.md5_image) ||
    item.cover_xl ||
    item.cover_big ||
    item.cover_medium ||
    item.cover ||
    buildDeezerCoverUrl(item.md5_image) ||
    ''
  )
}

function getFreshCacheMaxAge(path: string): number | undefined {
  if (/^\/artist\/\d+\/albums\?/.test(path)) {
    return ARTIST_ALBUMS_MAX_AGE_MS
  }

  return undefined
}

async function scheduleDeezerRequest<T>(request: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const scheduledAt = Math.max(now, nextAllowedRequestAt)
  nextAllowedRequestAt = scheduledAt + DEEZER_REQUEST_SLOT_MS
  const waitMs = scheduledAt - now

  if (waitMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitMs)
    })
  }

  return request()
}

async function deezerFetch<T>(path: string): Promise<T> {
  const cacheKey = path
  const freshMaxAge = getFreshCacheMaxAge(path)
  const cachedPayload = getDeezerCachedPayload<T>(cacheKey, freshMaxAge)

  if (cachedPayload) {
    return cachedPayload
  }

  const response = await scheduleDeezerRequest(() => fetch(`${DEEZER_API_BASE}${path}`))

  if (!response.ok) {
    const stalePayload = getDeezerStalePayload<T>(cacheKey)

    if (stalePayload) {
      return stalePayload
    }

    const details = await response.text()
    throw new Error(`Deezer API error ${response.status}: ${details}`)
  }

  const payload = (await response.json()) as T & DeezerApiErrorPayload

  if (payload?.error) {
    if (payload.error.code === 4) {
      const stalePayload = getDeezerStalePayload<T>(cacheKey)

      if (stalePayload) {
        return stalePayload
      }
    }

    const code = payload.error.code ?? 'unknown'
    const message = payload.error.message ?? 'Unknown Deezer API error'
    throw new Error(`Deezer API error ${code}: ${message}`)
  }

  setDeezerCachedPayload(cacheKey, payload, DEFAULT_DEEZER_CACHE_TTL_MS)

  return payload
}

export async function searchDeezerArtists(query: string, limit: number) {
  const encodedQuery = encodeURIComponent(query)
  const data = await deezerFetch<DeezerSearchResponse>(`/search/artist?q=${encodedQuery}&limit=${limit}`)
  const artists = asArray<DeezerSearchResponse['data'][number]>(data.data)

  return artists.map((artist) => ({
    id: String(artist.id),
    name: artist.name,
    genres: [] as string[],
    imageUrl: artist.picture_xl ?? artist.picture_big ?? artist.picture_medium ?? artist.picture,
    externalUrl: artist.link,
  }))
}

export async function fetchDeezerArtistDetail(artistId: string) {
  const artist = await deezerFetch<DeezerArtistResponse>(`/artist/${encodeURIComponent(artistId)}`)

  return {
    id: String(artist.id),
    name: artist.name,
    genres: [] as string[],
    imageUrl: resolveArtistImage(artist),
    externalUrl: artist.link,
  }
}

async function fetchPagedDeezerArtistAlbums(artistId: string, requested: number) {
  const albums: DeezerArtistAlbumsResponse['data'] = []
  let index = 0

  while (albums.length < requested) {
    const pageLimit = Math.min(DEEZER_PAGE_LIMIT, requested - albums.length)
    const page = await deezerFetch<DeezerArtistAlbumsResponse>(
      `/artist/${encodeURIComponent(artistId)}/albums?index=${index}&limit=${pageLimit}`,
    )
    const pageItems = asArray<DeezerArtistAlbumsResponse['data'][number]>(page.data)

    if (!pageItems.length) {
      break
    }

    albums.push(...pageItems)

    if (!page.next && pageItems.length < pageLimit) {
      break
    }

    index += pageItems.length
  }

  return albums
}

export async function fetchDeezerArtistReleases(artistId: string, limit: number | 'all') {
  const normalizedLimit = limit === 'all' ? MAX_DEEZER_RELEASES : Math.max(limit, 1)
  const requested = Math.min(normalizedLimit, MAX_DEEZER_RELEASES)
  const expandedLimit =
    limit === 'all' ? requested : Math.min(Math.max(requested * 8, 50), MAX_DEEZER_RELEASES)
  const albumDetailCache = new Map<number, Promise<DeezerAlbumDetailResponse>>()

  const artist = await deezerFetch<DeezerArtistResponse>(`/artist/${encodeURIComponent(artistId)}`)
  const albumItems = await fetchPagedDeezerArtistAlbums(artistId, expandedLimit)

  const rankedCandidates = [...albumItems]
    .sort((a, b) => {
      const aDate = Date.parse(a.release_date ?? '1970-01-01')
      const bDate = Date.parse(b.release_date ?? '1970-01-01')
      return bDate - aDate
    })
    .slice(0, requested)

  const albumAndEpCandidates = albumItems
    .filter((item) => item.record_type === 'album' || item.record_type === 'ep')
    .slice(0, 80)

  const earliestAlbumDateByTrackTitle = new Map<string, string>()

  await Promise.all(
    albumAndEpCandidates.map(async (item) => {
        const details = await deezerFetch<DeezerAlbumDetailResponse>(`/album/${item.id}`)
        const albumDate = details.release_date ?? item.release_date

        if (!albumDate || !details.tracks?.data?.length) {
          return
        }

        for (const track of details.tracks.data) {
          const key = normalizeTitle(track.title)
          const existing = earliestAlbumDateByTrackTitle.get(key)

          if (!existing || Date.parse(albumDate) < Date.parse(existing)) {
            earliestAlbumDateByTrackTitle.set(key, albumDate)
          }
        }
      }),
  )

  const releases = await Promise.all(
    rankedCandidates.map(async (item) => {
        const albumId = Number(item.id)
        let detailsPromise = albumDetailCache.get(albumId)

        if (!detailsPromise) {
          detailsPromise = deezerFetch<DeezerAlbumDetailResponse>(`/album/${item.id}`)
          albumDetailCache.set(albumId, detailsPromise)
        }

        const details = await detailsPromise

        const artistName = details.artist?.name ?? item.artist?.name ?? artist.name
        const title = details.title || item.title
        const rawReleaseDate = details.release_date ?? item.release_date ?? '1970-01-01'
        const titleKey = normalizeTitle(title)
        const albumBackfillDate = earliestAlbumDateByTrackTitle.get(titleKey)
        let effectiveReleaseDate =
          albumBackfillDate && Date.parse(albumBackfillDate) < Date.parse(rawReleaseDate)
            ? albumBackfillDate
            : rawReleaseDate

        const releaseType = normalizeRecordType(details.record_type ?? item.record_type)

        if (releaseType === 'single' && effectiveReleaseDate === rawReleaseDate) {
          const searchBackfillDate = await findOlderTrackDateViaSearch({
            artistId: artist.id,
            artistName: artist.name,
            title,
            currentAlbumId: albumId,
            currentReleaseDate: rawReleaseDate,
            albumDetailCache,
          })

          if (searchBackfillDate) {
            effectiveReleaseDate = searchBackfillDate
          }
        }

        return {
          id: String(item.id),
          artistId: String(details.artist?.id ?? item.artist?.id ?? artist.id ?? artistId),
          artistName,
          title,
          type: releaseType,
          releaseDate: effectiveReleaseDate,
          releaseDatePrecision: parseReleaseDatePrecision(effectiveReleaseDate),
          coverUrl: resolveCoverUrl(details, item),
          externalUrl: details.link || item.link,
          totalTracks: details.nb_tracks ?? item.nb_tracks ?? 0,
        }
      }),
  )

  return releases
}
