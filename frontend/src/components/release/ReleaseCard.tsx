import { useLanguage } from '../../contexts/LanguageContext'
import type { Release } from '../../types'
import { ReleaseTypeTag } from './ReleaseTypeTag'

interface ReleaseCardProps {
  release: Release
}

function buildSearchLink(provider: 'spotify' | 'deezer', release: Release): string {
  const query = encodeURIComponent(`${release.title} ${release.artistName}`)

  if (provider === 'spotify') {
    return `https://open.spotify.com/search/${query}`
  }

  return `https://www.deezer.com/search/${query}`
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
  const deezerUrl = release.provider === 'deezer' ? release.externalUrl : buildSearchLink('deezer', release)
  const spotifyUrl = release.provider === 'spotify' ? release.externalUrl : buildSearchLink('spotify', release)

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
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t('release.openSpotify')}
            title={t('release.openSpotify')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
          >
            <img src="/icons/spotify.svg" alt="" aria-hidden="true" className="h-5 w-5" />
          </a>
          <a
            href={deezerUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={t('release.openDeezer')}
            title={t('release.openDeezer')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-600"
          >
            <img src="/icons/deezer.svg" alt="" aria-hidden="true" className="h-5 w-5" />
          </a>
        </div>
      </div>
    </article>
  )
}
