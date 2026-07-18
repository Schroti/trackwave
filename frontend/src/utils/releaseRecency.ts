import type { Release } from '../types'
import { toReleaseDate } from './releaseDate'

const DEFAULT_RECENCY_WINDOW_DAYS = 90

export function isRecentRelease(release: Release, windowDays: number = DEFAULT_RECENCY_WINDOW_DAYS): boolean {
  const releaseTimestamp = toReleaseDate(release.releaseDate, release.releaseDatePrecision).getTime()
  const windowMs = windowDays * 24 * 60 * 60 * 1000

  return Date.now() - releaseTimestamp <= windowMs
}
