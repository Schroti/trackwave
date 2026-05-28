import { NavLink } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useArtistStore } from '../../store/useArtistStore'
import type { MusicProvider } from '../../services/api'

export function Navbar() {
  const { language, t, toggleLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const selectedProvider = useArtistStore((state) => state.selectedProvider)
  const setSelectedProvider = useArtistStore((state) => state.setSelectedProvider)

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value as MusicProvider)
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-300/70 bg-white/90 backdrop-blur-md dark-surface-navbar">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div>
          <p className="page-title text-2xl font-semibold text-slate-900 dark-text-primary">{t('nav.title')}</p>
        </div>

        <nav className="flex items-center gap-2 sm:gap-4">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-cyan-700 text-white hover:bg-cyan-600'
                  : 'text-slate-700 hover:bg-slate-200/90 dark-text-primary dark-hover-chip'
              }`
            }
          >
            {t('nav.dashboard')}
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-cyan-700 text-white hover:bg-cyan-600'
                  : 'text-slate-700 hover:bg-slate-200/90 dark-text-primary dark-hover-chip'
              }`
            }
          >
            {t('nav.search')}
          </NavLink>
          <NavLink
            to="/artists"
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-cyan-700 text-white hover:bg-cyan-600'
                  : 'text-slate-700 hover:bg-slate-200/90 dark-text-primary dark-hover-chip'
              }`
            }
          >
            {t('nav.artists')}
          </NavLink>

          <label className="flex items-center gap-2 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 dark-text-primary dark-border-primary">
            <span>{t('nav.provider')}</span>
            <select
              value={selectedProvider}
              onChange={(event) => handleProviderChange(event.target.value)}
              className="rounded-md bg-transparent text-xs font-semibold outline-none"
            >
              <option value="deezer">{t('provider.deezer')}</option>
              <option value="spotify">{t('provider.spotify')}</option>
            </select>
          </label>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark-text-primary dark-border-primary dark-hover-chip"
          >
            {theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
          </button>

          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark-text-primary dark-border-primary dark-hover-chip"
          >
            {language === 'de' ? t('language.switchToEnglish') : t('language.switchToGerman')}
          </button>
        </nav>
      </div>
    </header>
  )
}
