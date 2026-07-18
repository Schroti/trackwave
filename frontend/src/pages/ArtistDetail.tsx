import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MusicbrainzLinkButton } from '../components/release/MusicbrainzLinkButton'
import { ReleaseGrid } from '../components/release/ReleaseGrid'
import { EmptyState } from '../components/ui/EmptyState'
import { FollowButton } from '../components/ui/FollowButton'
import { useLanguage } from '../contexts/LanguageContext'
import { useArtistDetail } from '../hooks/useArtistDetail'
import { useMusicbrainzStatus } from '../hooks/useMusicbrainzStatus'
import { buildMusicbrainzArtistSearchLink } from '../utils/musicbrainzSearchLink'
import { buildMusicbrainzArtistViewLink } from '../utils/musicbrainzViewLink'

export function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()
  const { artist, provider, groupedReleases, isFollowing, isLoading, isFollowActionLoading, error, refresh, toggleFollow } =
    useArtistDetail(id)
  const { status: artistMusicbrainzStatus } = useMusicbrainzStatus(artist?.externalUrl, 'artist', Boolean(artist))
  const [showSyncNotice, setShowSyncNotice] = useState(false)
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current)
      }
    }
  }, [])

  const handleFollowToggle = async () => {
    const wasFollowing = isFollowing
    await toggleFollow()

    if (wasFollowing) {
      setShowSyncNotice(false)
      return
    }

    setShowSyncNotice(true)

    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current)
    }

    noticeTimeoutRef.current = setTimeout(() => {
      setShowSyncNotice(false)
    }, 12000)
  }

  if (!id) {
    return <EmptyState title={t('artistDetail.notFound')} />
  }

  return (
    <section className="space-y-5">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {artist?.imageUrl ? (
              <img
                src={artist.imageUrl}
                alt={artist.name}
                className="h-20 w-20 rounded-xl object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-200 text-xl font-bold text-slate-700">
                {(artist?.name ?? id).slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="page-title text-3xl font-bold text-slate-900">{artist?.name ?? t('artistDetail.title')}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {t('artistDetail.genresLabel')}: {artist?.genres.join(', ') || '—'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {t('artistDetail.providerLabel')}: {t(`provider.${provider}`)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FollowButton
              isFollowing={isFollowing}
              isLoading={isFollowActionLoading}
              onClick={() => void handleFollowToggle()}
            />
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              {t('artistDetail.refresh')}
            </button>
            {artist?.externalUrl ? (
              <a
                href={artist.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
              >
                {t('artistDetail.openExternal')}
              </a>
            ) : null}
            {artist && artistMusicbrainzStatus?.found === false ? (
              <MusicbrainzLinkButton
                href={buildMusicbrainzArtistSearchLink(artist.name)}
                tooltip={t('musicbrainz.missingArtistTooltip')}
                found={false}
                size="pill"
              />
            ) : null}
            {artist && artistMusicbrainzStatus?.found === true && artistMusicbrainzStatus.mbid ? (
              <MusicbrainzLinkButton
                href={buildMusicbrainzArtistViewLink(artistMusicbrainzStatus.mbid)}
                tooltip={t('musicbrainz.foundArtistTooltip')}
                found
                size="pill"
              />
            ) : null}
            <Link
              to="/artists"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
            >
              {t('artistDetail.back')}
            </Link>
          </div>
        </div>
        {showSyncNotice ? <p className="mt-3 text-sm font-semibold text-cyan-700 dark-text-primary">{t('actions.syncInBackground')}</p> : null}
      </div>

      {isLoading ? <p className="text-sm text-slate-700">{t('artistDetail.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600">{error || t('errors.generic')}</p> : null}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t('artistDetail.albums')}</h2>
        {groupedReleases.albums.length ? (
          <ReleaseGrid releases={groupedReleases.albums} />
        ) : (
          <EmptyState title={t('artistDetail.noAlbums')} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t('artistDetail.singles')}</h2>
        {groupedReleases.singles.length ? (
          <ReleaseGrid releases={groupedReleases.singles} />
        ) : (
          <EmptyState title={t('artistDetail.noSingles')} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">{t('artistDetail.compilations')}</h2>
        {groupedReleases.compilations.length ? (
          <ReleaseGrid releases={groupedReleases.compilations} />
        ) : (
          <EmptyState title={t('artistDetail.noCompilations')} />
        )}
      </div>
    </section>
  )
}
