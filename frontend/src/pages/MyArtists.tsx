import { useMemo, useState } from 'react'
import { ArtistList } from '../components/artist/ArtistList'
import { SearchBar } from '../components/ui/SearchBar'
import { EmptyState } from '../components/ui/EmptyState'
import { useLanguage } from '../contexts/LanguageContext'
import { useArtistStore } from '../store/useArtistStore'

type SortBy = 'followedAt' | 'name'

export function MyArtists() {
  const { t } = useLanguage()
  const followedArtists = useArtistStore((state) => state.followedArtists)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')

  const visibleArtists = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? followedArtists.filter((artist) => artist.name.toLowerCase().includes(normalizedQuery))
      : followedArtists

    const sorted = [...filtered]

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      sorted.sort((a, b) => Date.parse(a.followedAt) - Date.parse(b.followedAt))
    }

    return sorted
  }, [followedArtists, query, sortBy])

  return (
    <section className="space-y-5">
      <div>
        <h1 className="page-title text-3xl font-bold text-slate-900">{t('artists.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('artists.subtitle')}</p>
      </div>

      {followedArtists.length ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <SearchBar
                label={t('artists.searchLabel')}
                placeholder={t('artists.searchPlaceholder')}
                value={query}
                onChange={setQuery}
              />
            </div>
            <label className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 dark-text-primary dark-border-primary">
              <span>{t('artists.sortLabel')}</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                className="dark-field rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-900 outline-none"
              >
                <option value="followedAt">{t('artists.sortByFollowedAt')}</option>
                <option value="name">{t('artists.sortByName')}</option>
              </select>
            </label>
          </div>

          {visibleArtists.length ? (
            <ArtistList artists={visibleArtists} />
          ) : (
            <EmptyState title={t('artists.noResults')} />
          )}
        </>
      ) : (
        <EmptyState title={t('artists.empty')} />
      )}
    </section>
  )
}
