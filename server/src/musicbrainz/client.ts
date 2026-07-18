import { getMusicbrainzCachedPayload, setMusicbrainzCachedPayload } from '../cache/musicbrainzCache.js'

const MUSICBRAINZ_API_BASE = 'https://musicbrainz.org/ws/2'
const MUSICBRAINZ_REQUEST_SLOT_MS = Number(process.env.MUSICBRAINZ_REQUEST_SLOT_MS ?? 1100)
const MUSICBRAINZ_USER_AGENT = process.env.MUSICBRAINZ_CONTACT ?? 'Trackwave/1.0 ( contact-not-configured )'
const MUSICBRAINZ_CACHE_TTL_FOUND_MS = Number(process.env.MUSICBRAINZ_CACHE_TTL_FOUND_MS ?? 30 * 24 * 60 * 60 * 1000)
const MUSICBRAINZ_CACHE_TTL_MISSING_MS = Number(process.env.MUSICBRAINZ_CACHE_TTL_MISSING_MS ?? 24 * 60 * 60 * 1000)

let nextAllowedRequestAt = Date.now()

export type MusicbrainzEntity = 'release' | 'artist'

export interface MusicbrainzStatus {
  found: boolean
  mbid?: string
}

interface MusicbrainzRelation {
  release?: { id: string }
  artist?: { id: string }
}

interface MusicbrainzUrlResponse {
  relations?: MusicbrainzRelation[]
}

async function scheduleMusicbrainzRequest<T>(request: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const scheduledAt = Math.max(now, nextAllowedRequestAt)
  nextAllowedRequestAt = scheduledAt + MUSICBRAINZ_REQUEST_SLOT_MS
  const waitMs = scheduledAt - now

  if (waitMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitMs)
    })
  }

  return request()
}

export async function checkMusicbrainzStatus(url: string, entity: MusicbrainzEntity): Promise<MusicbrainzStatus> {
  const cacheKey = `${entity}:${url}`
  const cachedStatus = getMusicbrainzCachedPayload<MusicbrainzStatus>(cacheKey)

  if (cachedStatus) {
    return cachedStatus
  }

  const requestUrl = `${MUSICBRAINZ_API_BASE}/url?resource=${encodeURIComponent(url)}&inc=${entity}-rels&fmt=json`
  const response = await scheduleMusicbrainzRequest(() =>
    fetch(requestUrl, { headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT } }),
  )

  if (response.status === 404) {
    const result: MusicbrainzStatus = { found: false }
    setMusicbrainzCachedPayload(cacheKey, result, MUSICBRAINZ_CACHE_TTL_MISSING_MS)
    return result
  }

  if (!response.ok) {
    throw new Error(`MusicBrainz API error ${response.status}`)
  }

  const payload = (await response.json()) as MusicbrainzUrlResponse
  const relations = payload.relations ?? []
  const found = relations.length > 0
  const mbid = found ? relations[0]?.[entity]?.id : undefined
  const result: MusicbrainzStatus = mbid ? { found, mbid } : { found }
  setMusicbrainzCachedPayload(cacheKey, result, found ? MUSICBRAINZ_CACHE_TTL_FOUND_MS : MUSICBRAINZ_CACHE_TTL_MISSING_MS)

  return result
}
