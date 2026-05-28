import { useLanguage } from '../../contexts/LanguageContext'
import type { Release } from '../../types'
import { ReleaseTypeTag } from './ReleaseTypeTag'

interface ReleaseCardProps {
  release: Release
}

function normalizeReleaseDate(value: string, precision: Release['releaseDatePrecision']): string {
  if (precision === 'year') {
    return `${value}-01-01`
  }

  if (precision === 'month') {
    return `${value}-01`
  }

  return value
}

export function ReleaseCard({ release }: ReleaseCardProps) {
  const { t } = useLanguage()
  const date = new Date(normalizeReleaseDate(release.releaseDate, release.releaseDatePrecision))

  return (
    <article className="glass-panel rounded-2xl p-4">
      <img
        src={release.coverUrl}
        alt={release.title}
        className="h-48 w-full rounded-xl object-cover"
        loading="lazy"
      />
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-semibold text-slate-900">{release.title}</h3>
          <ReleaseTypeTag type={release.type} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{release.artistName}</p>
        <p className="mt-1 text-sm text-slate-600">{date.toLocaleDateString()}</p>
        <p className="mt-1 text-xs text-slate-500">
          {release.totalTracks} {t('release.tracks')}
        </p>
        <a
          href={release.externalUrl || release.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700"
        >
          {t('release.openSpotify')}
        </a>
      </div>
    </article>
  )
}
