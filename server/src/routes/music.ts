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
import type { Artist, Release } from '../types.js'

const router = Router()

type ProviderId = 'spotify' | 'deezer'

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

export default router
