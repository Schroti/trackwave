import { useCallback, useEffect, useMemo, useState } from 'react'
import { getArtistReleases } from '../services/api'
import { useArtistStore } from '../store/useArtistStore'
import type { Release } from '../types'

const MAX_CONCURRENT_REQUESTS = 5

async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = []
  let current = 0

  async function worker() {
    while (current < tasks.length) {
      const index = current
      current += 1
      const value = await tasks[index]()
      results.push(value)
    }
  }

  const workerCount = Math.min(concurrency, tasks.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return results
}

function releaseDateToTimestamp(releaseDate: string, precision: Release['releaseDatePrecision']): number {
  if (precision === 'year') {
    return Date.parse(`${releaseDate}-01-01`)
  }

  if (precision === 'month') {
    return Date.parse(`${releaseDate}-01`)
  }

  return Date.parse(releaseDate)
}

export function useDashboardReleases() {
  const followedArtists = useArtistStore((state) => state.followedArtists)
  const monthsFilter = useArtistStore((state) => state.monthsFilter)
  const [releases, setReleases] = useState<Release[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!followedArtists.length) {
      setReleases([])
      setError(null)
      return
    }

    const tasks = followedArtists.map((artist) => async () => {
      const response = await getArtistReleases(artist.id)
      return response.releases
    })

    setIsLoading(true)
    setError(null)

    try {
      const responses = await runWithConcurrency(tasks, MAX_CONCURRENT_REQUESTS)
      const combined = responses.flat().sort((a, b) => {
        return (
          releaseDateToTimestamp(b.releaseDate, b.releaseDatePrecision) -
          releaseDateToTimestamp(a.releaseDate, a.releaseDatePrecision)
        )
      })
      setReleases(combined)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unknown error')
      setReleases([])
    } finally {
      setIsLoading(false)
    }
  }, [followedArtists])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filteredReleases = useMemo(() => {
    const threshold = new Date()
    threshold.setMonth(threshold.getMonth() - monthsFilter)

    return releases.filter((release) => {
      const timestamp = releaseDateToTimestamp(release.releaseDate, release.releaseDatePrecision)
      return timestamp >= threshold.getTime()
    })
  }, [releases, monthsFilter])

  return {
    releases: filteredReleases,
    hasFollowedArtists: followedArtists.length > 0,
    isLoading,
    error,
    refresh,
  }
}
