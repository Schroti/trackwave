import { useCallback, useEffect, useMemo, useState } from 'react'
import { getArtistReleases, refreshArtist } from '../services/api'
import { useArtistStore } from '../store/useArtistStore'
import type { Release } from '../types'

const MAX_CONCURRENT_REQUESTS = 5
const INITIAL_VISIBLE_WEEKS = 5
const LOAD_MORE_WEEKS = 5

export interface DashboardWeekSection {
  key: string
  isoWeek: number
  isoYear: number
  weekStartUtc: Date
  weekEndUtc: Date
  releases: Release[]
}

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

function toNormalizedReleaseDate(releaseDate: string, precision: Release['releaseDatePrecision']): Date {
  const normalized =
    precision === 'year' ? `${releaseDate}-01-01` : precision === 'month' ? `${releaseDate}-01` : releaseDate
  const [yearRaw, monthRaw, dayRaw] = normalized.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  return new Date(Date.UTC(year, month - 1, day))
}

function getIsoWeekStartUtc(dateUtc: Date): Date {
  const result = new Date(dateUtc)
  const day = result.getUTCDay() || 7
  result.setUTCDate(result.getUTCDate() - day + 1)
  result.setUTCHours(0, 0, 0, 0)
  return result
}

function getIsoWeekInfo(dateUtc: Date): { week: number; year: number } {
  const normalized = new Date(Date.UTC(dateUtc.getUTCFullYear(), dateUtc.getUTCMonth(), dateUtc.getUTCDate()))
  const day = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day)
  const year = normalized.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return { week, year }
}

export function useDashboardReleases() {
  const followedArtists = useArtistStore((state) => state.followedArtists)
  const [releases, setReleases] = useState<Release[]>([])
  const [visibleWeekCount, setVisibleWeekCount] = useState(INITIAL_VISIBLE_WEEKS)
  const [isLoading, setIsLoading] = useState(false)
  const [isForceReloading, setIsForceReloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!followedArtists.length) {
      setReleases([])
      setError(null)
      return
    }

    const tasks = followedArtists.map((artist) => async () => {
      const response = await getArtistReleases(artist.id, 10, artist.provider)
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

  useEffect(() => {
    setVisibleWeekCount(INITIAL_VISIBLE_WEEKS)
  }, [followedArtists])

  const weekSections = useMemo<DashboardWeekSection[]>(() => {
    const grouped = new Map<string, DashboardWeekSection>()

    for (const release of releases) {
      const releaseDateUtc = toNormalizedReleaseDate(release.releaseDate, release.releaseDatePrecision)
      const weekStartUtc = getIsoWeekStartUtc(releaseDateUtc)
      const weekEndUtc = new Date(weekStartUtc)
      weekEndUtc.setUTCDate(weekEndUtc.getUTCDate() + 6)

      const iso = getIsoWeekInfo(releaseDateUtc)
      const key = `${iso.year}-W${String(iso.week).padStart(2, '0')}`
      const existing = grouped.get(key)

      if (!existing) {
        grouped.set(key, {
          key,
          isoWeek: iso.week,
          isoYear: iso.year,
          weekStartUtc,
          weekEndUtc,
          releases: [release],
        })
        continue
      }

      existing.releases.push(release)
    }

    return Array.from(grouped.values())
      .map((section) => ({
        ...section,
        releases: [...section.releases].sort((a, b) => {
          return (
            releaseDateToTimestamp(b.releaseDate, b.releaseDatePrecision) -
            releaseDateToTimestamp(a.releaseDate, a.releaseDatePrecision)
          )
        }),
      }))
      .sort((a, b) => b.weekStartUtc.getTime() - a.weekStartUtc.getTime())
  }, [releases])

  const visibleWeekSections = useMemo(() => {
    return weekSections.slice(0, visibleWeekCount)
  }, [weekSections, visibleWeekCount])

  const canLoadMoreWeeks = visibleWeekCount < weekSections.length

  const loadMoreWeeks = () => {
    setVisibleWeekCount((current) => current + LOAD_MORE_WEEKS)
  }

  const forceReloadAll = useCallback(async () => {
    if (!followedArtists.length || isForceReloading) {
      return
    }

    setIsForceReloading(true)
    setError(null)

    try {
      const tasks = followedArtists.map((artist) => async () => {
        try {
          await refreshArtist(artist.id, artist.provider)
          return null
        } catch (reloadError) {
          const reason = reloadError instanceof Error ? reloadError.message : 'Unknown error'
          return `${artist.name}: ${reason}`
        }
      })

      const results = await runWithConcurrency(tasks, 3)
      const failures = results.filter((value): value is string => value !== null)

      if (failures.length) {
        setError(`Force reload completed with ${failures.length} error(s). ${failures[0]}`)
      }

      await refresh()
    } finally {
      setIsForceReloading(false)
    }
  }, [followedArtists, isForceReloading, refresh])

  return {
    releases,
    weekSections: visibleWeekSections,
    visibleWeekCount,
    canLoadMoreWeeks,
    loadMoreWeeks,
    hasFollowedArtists: followedArtists.length > 0,
    isLoading,
    isForceReloading,
    error,
    refresh,
    forceReloadAll,
  }
}
