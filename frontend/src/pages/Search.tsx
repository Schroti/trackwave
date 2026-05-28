import { useState } from 'react'
import { ArtistSearchResult } from '../components/artist/ArtistSearchResult'
import { SearchBar } from '../components/ui/SearchBar'
import { EmptyState } from '../components/ui/EmptyState'
import { useLanguage } from '../contexts/LanguageContext'
import { useArtistSearch } from '../hooks/useArtistSearch'

export function Search() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const { artists, isLoading, error } = useArtistSearch(query)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="page-title text-3xl font-bold text-slate-900">{t('search.title')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('search.subtitle')}</p>
      </div>

      <div className="glass-panel rounded-2xl p-4">
        <SearchBar
          label={t('search.inputLabel')}
          placeholder={t('search.placeholder')}
          value={query}
          onChange={setQuery}
        />
      </div>

      {isLoading ? <p className="text-sm text-slate-700">{t('search.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600">{error || t('errors.generic')}</p> : null}

      {!isLoading && query.trim() && !artists.length ? <EmptyState title={t('search.noResults')} /> : null}

      <div className="grid grid-cols-1 gap-3">
        {artists.map((artist) => (
          <ArtistSearchResult key={artist.id} artist={artist} />
        ))}
      </div>
    </section>
  )
}
