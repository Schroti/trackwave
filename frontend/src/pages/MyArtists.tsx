import { ArtistList } from '../components/artist/ArtistList'
import { EmptyState } from '../components/ui/EmptyState'
import { useLanguage } from '../contexts/LanguageContext'
import { useArtistStore } from '../store/useArtistStore'

export function MyArtists() {
  const { t } = useLanguage()
  const followedArtists = useArtistStore((state) => state.followedArtists)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="page-title text-3xl font-bold text-slate-900">{t('artists.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('artists.subtitle')}</p>
      </div>

      {followedArtists.length ? (
        <ArtistList artists={followedArtists} />
      ) : (
        <EmptyState title={t('artists.empty')} />
      )}
    </section>
  )
}
