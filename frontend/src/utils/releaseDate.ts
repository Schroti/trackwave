import type { Release } from '../types'

export function toReleaseDate(releaseDate: string, precision: Release['releaseDatePrecision']): Date {
  const normalized =
    precision === 'year' ? `${releaseDate}-01-01` : precision === 'month' ? `${releaseDate}-01` : releaseDate
  const [yearRaw, monthRaw, dayRaw] = normalized.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  return new Date(Date.UTC(year, month - 1, day))
}
