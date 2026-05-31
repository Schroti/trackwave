import { Router } from 'express'
import {
  fetchAllSpotifyArtistReleases,
  fetchSpotifyArtistDetail,
  fetchSpotifyArtistReleases,
  searchSpotifyArtists,
} from '../spotify/client.js'
import {
  fetchDeezerArtistDetail,
  fetchDeezerArtistReleases,
  searchDeezerArtists,
} from '../deezer/client.js'
import {
  getArtistDetailSnapshot,
  getArtistReleasesSnapshot,
  isFollowedArtist,
  markFullSyncComplete,
  markIncrementalSyncComplete,
  removeFollowedArtist,
  setArtistSyncStatus,
  upsertArtistDetail,
  upsertFollowedArtist,
} from '../db/syncStore.js'
import { syncArtistSnapshot } from '../sync/artistSync.js'
import type { Artist, ProviderId, Release } from '../types.js'

const router = Router()

const defaultProvider = (process.env.MUSIC_PROVIDER_DEFAULT ?? 'deezer').toLowerCase() as ProviderId

function getRequestedProvider(value: unknown): ProviderId {
  const normalized = String(value ?? defaultProvider).toLowerCase()

  if (normalized === 'spotify') {
    return 'spotify'
  }

  return 'deezer'
}

function toSpotifyArtist(item: {
  id: string
  name: string
  genres: string[]
  images: Array<{ url: string }>
  external_urls: { spotify: string }
}): Artist {
  const externalUrl = item.external_urls.spotify

  return {
    id: item.id,
    name: item.name,
    imageUrl: item.images[0]?.url,
    genres: item.genres,
    followedAt: new Date().toISOString(),
    provider: 'spotify',
    externalUrl,
    spotifyUrl: externalUrl,
  }
}

function toDeezerArtist(item: {
  id: string
  name: string
  imageUrl?: string
  genres: string[]
  externalUrl: string
}): Artist {
  return {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    genres: item.genres,
    followedAt: new Date().toISOString(),
    provider: 'deezer',
    externalUrl: item.externalUrl,
    spotifyUrl: item.externalUrl,
  }
}

function parseReleaseLimit(value: unknown): number | 'all' {
  if (String(value ?? '').toLowerCase() === 'all') {
    return 'all'
  }

  const numeric = Number(value ?? 10)
  return Math.min(Math.max(numeric, 1), 50)
}

function parseGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === 'string')
}

function parseOptionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function toNormalizedFollowArtist(payload: unknown): Artist | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const body = payload as Partial<Artist>
  const id = parseOptionalText(body.id)
  const name = parseOptionalText(body.name)

  if (!id || !name) {
    return null
  }

  const provider = getRequestedProvider(body.provider)
  const now = new Date().toISOString()
  const externalUrl = parseOptionalText(body.externalUrl) ?? ''

  return {
    id,
    name,
    imageUrl: parseOptionalText(body.imageUrl),
    genres: parseGenres(body.genres),
    followedAt: now,
    provider,
    externalUrl,
    spotifyUrl: parseOptionalText(body.spotifyUrl) ?? externalUrl,
  }
}

function toSpotifyRelease(
  item: {
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
  },
  fallbackArtistId: string,
): Release {
  const firstArtist = item.artists[0]
  const externalUrl = item.external_urls.spotify

  return {
    id: item.id,
    artistId: firstArtist?.id ?? fallbackArtistId,
    artistName: firstArtist?.name ?? 'Unknown artist',
    title: item.name,
    type: item.album_type,
    releaseDate: item.release_date,
    releaseDatePrecision: item.release_date_precision,
    coverUrl: item.images[0]?.url ?? '',
    provider: 'spotify',
    externalUrl,
    spotifyUrl: externalUrl,
    totalTracks: item.total_tracks,
  }
}

function toDeezerRelease(item: {
  id: string
  artistId: string
  artistName: string
  title: string
  type: 'album' | 'single' | 'compilation'
  releaseDate: string
  releaseDatePrecision: 'year' | 'month' | 'day'
  coverUrl: string
  externalUrl: string
  totalTracks: number
}): Release {
  return {
    id: item.id,
    artistId: item.artistId,
    artistName: item.artistName,
    title: item.title,
    type: item.type,
    releaseDate: item.releaseDate,
    releaseDatePrecision: item.releaseDatePrecision,
    coverUrl: item.coverUrl,
    provider: 'deezer',
    externalUrl: item.externalUrl,
    spotifyUrl: item.externalUrl,
    totalTracks: item.totalTracks,
  }
}

router.get('/search-artists', async (req, res) => {
  try {
    const query = String(req.query.q ?? '').trim()
    const limit = Number(req.query.limit ?? 8)
    const provider = getRequestedProvider(req.query.provider)

    if (!query) {
      res.status(400).json({ message: 'Missing query parameter q.' })
      return
    }

    const normalizedLimit = Math.min(Math.max(limit, 1), 20)
    const artists =
      provider === 'spotify'
        ? (await searchSpotifyArtists(query, normalizedLimit)).map(toSpotifyArtist)
        : (await searchDeezerArtists(query, normalizedLimit)).map(toDeezerArtist)

    res.json({
      provider,
      artists,
    })
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to search artists.',
    })
  }
})

router.get('/artists/:id/releases', async (req, res) => {
  try {
    const artistId = String(req.params.id)
    const limit = parseReleaseLimit(req.query.limit)
    const provider = getRequestedProvider(req.query.provider)

    const persistedReleases = getArtistReleasesSnapshot(provider, artistId, limit)

    if (persistedReleases.length > 0) {
      res.json({
        provider,
        artistId,
        releases: persistedReleases,
      })
      return
    }

    if (isFollowedArtist(provider, artistId)) {
      setArtistSyncStatus(provider, artistId, 'syncing', null)

      try {
        const syncResult = await syncArtistSnapshot({ provider, artistId })
        markIncrementalSyncComplete(provider, artistId, syncResult.syncedAt)

        const refreshedReleases = getArtistReleasesSnapshot(provider, artistId, limit)
        res.json({
          provider,
          artistId,
          releases: refreshedReleases,
        })
        return
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Unknown sync error'
        setArtistSyncStatus(provider, artistId, 'error', message)
      }
    }

    const releases =
      provider === 'spotify'
        ? (limit === 'all'
            ? await fetchAllSpotifyArtistReleases(artistId)
            : await fetchSpotifyArtistReleases(artistId, limit)
          ).map((item) => toSpotifyRelease(item, artistId))
        : (await fetchDeezerArtistReleases(artistId, limit)).map(toDeezerRelease)

    res.json({
      provider,
      artistId,
      releases,
    })
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to fetch releases.',
    })
  }
})

router.get('/artists/:id/detail', async (req, res) => {
  try {
    const artistId = String(req.params.id)
    const provider = getRequestedProvider(req.query.provider)

    const persistedArtist = getArtistDetailSnapshot(provider, artistId)

    if (persistedArtist) {
      res.json({
        provider,
        artist: persistedArtist,
      })
      return
    }

    if (isFollowedArtist(provider, artistId)) {
      setArtistSyncStatus(provider, artistId, 'syncing', null)

      try {
        const syncResult = await syncArtistSnapshot({ provider, artistId })
        markIncrementalSyncComplete(provider, artistId, syncResult.syncedAt)

        res.json({
          provider,
          artist: syncResult.artist,
        })
        return
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Unknown sync error'
        setArtistSyncStatus(provider, artistId, 'error', message)
      }
    }

    const artist =
      provider === 'spotify'
        ? toSpotifyArtist(await fetchSpotifyArtistDetail(artistId))
        : toDeezerArtist(await fetchDeezerArtistDetail(artistId))

    res.json({
      provider,
      artist,
    })
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to fetch artist detail.',
    })
  }
})

router.post('/artists/follow', async (req, res) => {
  const artist = toNormalizedFollowArtist(req.body)

  if (!artist) {
    res.status(400).json({ message: 'Invalid artist payload.' })
    return
  }

  const alreadyFollowed = isFollowedArtist(artist.provider, artist.id)

  try {
    upsertFollowedArtist(artist)
    upsertArtistDetail(artist)
    setArtistSyncStatus(artist.provider, artist.id, 'syncing', null)

    const syncResult = await syncArtistSnapshot({
      provider: artist.provider,
      artistId: artist.id,
      followedAt: artist.followedAt,
    })

    markFullSyncComplete(artist.provider, artist.id, syncResult.syncedAt)

    res.status(alreadyFollowed ? 200 : 201).json({
      provider: artist.provider,
      alreadyFollowed,
      syncedAt: syncResult.syncedAt,
      artist: syncResult.artist,
      releasesCount: syncResult.releases.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to follow artist.'
    setArtistSyncStatus(artist.provider, artist.id, 'error', message)

    res.status(502).json({ message })
  }
})

router.delete('/artists/:id/follow', (req, res) => {
  try {
    const artistId = String(req.params.id)
    const provider = getRequestedProvider(req.query.provider)

    removeFollowedArtist(provider, artistId)

    res.json({
      provider,
      artistId,
      unfollowed: true,
    })
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to unfollow artist.',
    })
  }
})

router.post('/artists/:id/refresh', async (req, res) => {
  try {
    const artistId = String(req.params.id)
    const provider = getRequestedProvider(req.query.provider)
    const followed = isFollowedArtist(provider, artistId)

    if (followed) {
      setArtistSyncStatus(provider, artistId, 'syncing', null)
    }

    const syncResult = await syncArtistSnapshot({ provider, artistId })

    if (followed) {
      markFullSyncComplete(provider, artistId, syncResult.syncedAt)
    }

    res.json({
      provider,
      artistId,
      syncedAt: syncResult.syncedAt,
      releasesCount: syncResult.releases.length,
    })
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to refresh artist.',
    })
  }
})

export default router
