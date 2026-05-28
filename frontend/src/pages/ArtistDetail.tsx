import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

export function ArtistDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useLanguage()

  return (
    <section className="glass-panel rounded-2xl p-6">
      <h1 className="page-title text-3xl font-bold text-slate-900">{t('artistDetail.title')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('artistDetail.subtitle')}</p>
      <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
        {t('artistDetail.idLabel')}: {id}
      </p>
      <Link
        to="/artists"
        className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        {t('artistDetail.back')}
      </Link>
    </section>
  )
}
