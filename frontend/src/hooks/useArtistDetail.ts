import { useCallback, useEffect, useMemo, useState } from 'react'
import { getArtistDetail, getArtistReleases, type MusicProvider } from '../services/api'
import { useArtistStore } from '../store/useArtistStore'
import type { Artist, Release } from '../types'

function releaseDateToTimestamp(releaseDate: string, precision: Release['releaseDatePrecision']): number {
  if (precision === 'year') {
    return Date.parse(`${releaseDate}-01-01`)
  }

  if (precision === 'month') {
    return Date.parse(`${releaseDate}-01`)
  }

  return Date.parse(releaseDate)
}

export function useArtistDetail(artistId: string | undefined) {
  const followedArtists = useArtistStore((state) => state.followedArtists)
  const selectedProvider = useArtistStore((state) => state.selectedProvider)
  const followArtist = useArtistStore((state) => state.followArtist)
  const unfollowArtist = useArtistStore((state) => state.unfollowArtist)
  const isFollowing = useArtistStore((state) => (artistId ? state.isFollowing(artistId) : false))

  const followedArtist = useMemo(
    () => followedArtists.find((artist) => artist.id === artistId),
    [followedArtists, artistId],
  )

  const provider: MusicProvider = followedArtist?.provider ?? selectedProvider

  const [artist, setArtist] = useState<Artist | null>(followedArtist ?? null)
  const [releases, setReleases] = useState<Release[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!artistId) {
      setError('Missing artist id')
      setArtist(null)
      setReleases([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [detailResponse, releasesResponse] = await Promise.all([
        getArtistDetail(artistId, provider),
        getArtistReleases(artistId, 'all', provider),
      ])

      const nextArtist: Artist = {
        ...detailResponse.artist,
        followedAt: followedArtist?.followedAt ?? detailResponse.artist.followedAt,
      }

      const sortedReleases = [...releasesResponse.releases].sort((a, b) => {
        return (
          releaseDateToTimestamp(b.releaseDate, b.releaseDatePrecision) -
          releaseDateToTimestamp(a.releaseDate, a.releaseDatePrecision)
        )
      })

      setArtist(nextArtist)
      setReleases(sortedReleases)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown error')
      setReleases([])

      if (!followedArtist) {
        setArtist(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [artistId, provider, followedArtist])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const groupedReleases = useMemo(() => {
    const albums = releases.filter((release) => release.type === 'album')
    const singles = releases.filter((release) => release.type === 'single')
    const compilations = releases.filter((release) => release.type === 'compilation')

    return { albums, singles, compilations }
  }, [releases])

  const toggleFollow = async () => {
    if (!artistId || !artist) {
      return
    }

    if (isFollowing) {
      await unfollowArtist(artistId)
      return
    }

    await followArtist(artist)
  }

  return {
    artist,
    provider,
    releases,
    groupedReleases,
    isFollowing,
    isLoading,
    error,
    refresh,
    toggleFollow,
  }
}
