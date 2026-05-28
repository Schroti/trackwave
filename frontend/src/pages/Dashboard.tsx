import { useLanguage } from '../contexts/LanguageContext'
import { useDashboardReleases } from '../hooks/useDashboardReleases'
import { useArtistStore } from '../store/useArtistStore'
import { ReleaseGrid } from '../components/release/ReleaseGrid'
import { EmptyState } from '../components/ui/EmptyState'

export function Dashboard() {
  const { t } = useLanguage()
  const monthsFilter = useArtistStore((state) => state.monthsFilter)
  const setMonthsFilter = useArtistStore((state) => state.setMonthsFilter)
  const { releases, hasFollowedArtists, isLoading, error, refresh } = useDashboardReleases()

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-3xl font-bold text-slate-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-slate-600">{t('dashboard.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          {t('dashboard.refresh')}
        </button>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <label className="text-sm font-semibold text-slate-700">{t('dashboard.filterLabel')}</label>
        <input
          type="range"
          min={1}
          max={24}
          value={monthsFilter}
          onChange={(event) => setMonthsFilter(Number(event.target.value))}
          className="w-44"
        />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {monthsFilter}
        </span>
      </div>

      {isLoading ? <p className="text-sm text-slate-700">{t('dashboard.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600">{error || t('errors.generic')}</p> : null}

      {!hasFollowedArtists ? (
        <EmptyState title={t('dashboard.noFollowed')} />
      ) : null}

      {hasFollowedArtists && !isLoading && !releases.length ? (
        <EmptyState title={t('dashboard.noReleases')} />
      ) : null}

      {releases.length ? <ReleaseGrid releases={releases} /> : null}
    </section>
  )
}
