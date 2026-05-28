import { NavLink } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'

export function Navbar() {
  const { language, t, toggleLanguage } = useLanguage()

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="page-title text-2xl font-semibold text-slate-900">{t('nav.title')}</p>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200/80'
              }`
            }
          >
            {t('nav.dashboard')}
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200/80'
              }`
            }
          >
            {t('nav.search')}
          </NavLink>
          <NavLink
            to="/artists"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200/80'
              }`
            }
          >
            {t('nav.artists')}
          </NavLink>

          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            {language === 'de' ? t('language.switchToEnglish') : t('language.switchToGerman')}
          </button>
        </nav>
      </div>
    </header>
  )
}
