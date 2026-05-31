import {
  fetchAllSpotifyArtistReleases,
  fetchSpotifyArtistDetail,
} from '../spotify/client.js'
import { fetchDeezerArtistDetail, fetchDeezerArtistReleases } from '../deezer/client.js'
import type { Artist, ProviderId, Release } from '../types.js'
import { replaceArtistReleases, upsertArtistDetail } from '../db/syncStore.js'

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

export interface SyncArtistSnapshotResult {
  artist: Artist
  releases: Release[]
  syncedAt: string
}

interface SyncArtistSnapshotOptions {
  provider: ProviderId
  artistId: string
  followedAt?: string
}

function sortReleasesDescending(releases: Release[]): Release[] {
  return [...releases].sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
}

export async function syncArtistSnapshot(options: SyncArtistSnapshotOptions): Promise<SyncArtistSnapshotResult> {
  const { provider, artistId, followedAt } = options

  const result =
    provider === 'spotify'
      ? await syncSpotifySnapshot(artistId, followedAt)
      : await syncDeezerSnapshot(artistId, followedAt)

  upsertArtistDetail(result.artist)
  replaceArtistReleases(provider, artistId, result.releases)

  return result
}

async function syncSpotifySnapshot(
  artistId: string,
  followedAt: string | undefined,
): Promise<SyncArtistSnapshotResult> {
  const syncedAt = new Date().toISOString()
  const detail = await fetchSpotifyArtistDetail(artistId)
  const releases = (await fetchAllSpotifyArtistReleases(artistId)).map((item) => toSpotifyRelease(item, artistId))
  const artist = {
    ...toSpotifyArtist(detail),
    followedAt: followedAt ?? syncedAt,
  }

  return {
    artist,
    releases: sortReleasesDescending(releases),
    syncedAt,
  }
}

async function syncDeezerSnapshot(
  artistId: string,
  followedAt: string | undefined,
): Promise<SyncArtistSnapshotResult> {
  const syncedAt = new Date().toISOString()
  const detail = await fetchDeezerArtistDetail(artistId)
  const releases = (await fetchDeezerArtistReleases(artistId, 'all')).map(toDeezerRelease)
  const artist = {
    ...toDeezerArtist(detail),
    followedAt: followedAt ?? syncedAt,
  }

  return {
    artist,
    releases: sortReleasesDescending(releases),
    syncedAt,
  }
}
