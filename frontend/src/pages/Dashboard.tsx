import { useLanguage } from '../contexts/LanguageContext'
import { useDashboardReleases } from '../hooks/useDashboardReleases'
import { ReleaseGrid } from '../components/release/ReleaseGrid'
import { EmptyState } from '../components/ui/EmptyState'

function formatWeekRange(startUtc: Date, endUtc: Date, language: 'de' | 'en'): string {
  const locale = language === 'de' ? 'de-DE' : 'en-US'
  const sameYear = startUtc.getUTCFullYear() === endUtc.getUTCFullYear()

  const startFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })

  const endFormatter = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

  return `${startFormatter.format(startUtc)} - ${endFormatter.format(endUtc)}`
}

export function Dashboard() {
  const { t, language } = useLanguage()
  const { weekSections, hasFollowedArtists, isLoading, error, refresh, canLoadMoreWeeks, loadMoreWeeks } =
    useDashboardReleases()

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

      {isLoading ? <p className="text-sm text-slate-700">{t('dashboard.loading')}</p> : null}
      {error ? <p className="text-sm text-red-600">{error || t('errors.generic')}</p> : null}

      {!hasFollowedArtists ? (
        <EmptyState title={t('dashboard.noFollowed')} />
      ) : null}

      {hasFollowedArtists && !isLoading && !weekSections.length ? (
        <EmptyState title={t('dashboard.noReleases')} />
      ) : null}

      {weekSections.map((section) => (
        <article key={section.key} className="space-y-3">
          <div className="glass-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4">
            <h2 className="text-lg font-bold text-slate-900">
              {t('dashboard.weekPrefix')} {section.isoWeek}
            </h2>
            <span className="text-sm font-semibold text-slate-600">
              {formatWeekRange(section.weekStartUtc, section.weekEndUtc, language)}
            </span>
          </div>
          <ReleaseGrid releases={section.releases} />
        </article>
      ))}

      {canLoadMoreWeeks ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMoreWeeks}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {t('dashboard.loadMoreWeeks')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
