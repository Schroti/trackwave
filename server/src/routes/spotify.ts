import { Router } from 'express'
import { fetchSpotifyArtistReleases, searchSpotifyArtists } from '../spotify/client.js'
import { fetchDeezerArtistReleases, searchDeezerArtists } from '../deezer/client.js'
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

function toArtist(item: {
  id: string
  name: string
  genres: string[]
  images: Array<{ url: string }>
  external_urls: { spotify: string }
}, provider: ProviderId): Artist {
  const externalUrl = item.external_urls.spotify

  return {
    id: item.id,
    name: item.name,
    imageUrl: item.images[0]?.url,
    genres: item.genres,
    followedAt: new Date().toISOString(),
    provider,
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

function toRelease(
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
  provider: ProviderId,
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
    provider,
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
        ? (await searchSpotifyArtists(query, normalizedLimit)).map((item) => toArtist(item, 'spotify'))
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
    const limit = Number(req.query.limit ?? 10)
    const provider = getRequestedProvider(req.query.provider)
    const normalizedLimit = Math.min(Math.max(limit, 1), 50)

    const releases =
      provider === 'spotify'
        ? (await fetchSpotifyArtistReleases(artistId, normalizedLimit)).items.map((item) =>
            toRelease(item, artistId, 'spotify'),
          )
        : (await fetchDeezerArtistReleases(artistId, normalizedLimit)).map(toDeezerRelease)

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

export default router
