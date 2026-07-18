import { useLanguage } from '../../contexts/LanguageContext'

interface MusicbrainzLinkButtonProps {
  href: string
  tooltip: string
  found: boolean
  size?: 'icon' | 'pill'
}

function WarningIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function MusicbrainzLinkButton({ href, tooltip, found, size = 'icon' }: MusicbrainzLinkButtonProps) {
  const { t } = useLanguage()
  const colorClasses = found
    ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark-border-primary'
    : 'bg-amber-600 text-white hover:bg-amber-500'

  if (size === 'pill') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={tooltip}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${colorClasses}`}
      >
        {found ? (
          <img src="/icons/musicbrainz.svg" alt="" aria-hidden="true" className="h-4 w-4" />
        ) : (
          <WarningIcon className="h-4 w-4" />
        )}
        {t('musicbrainz.label')}
      </a>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={tooltip}
      title={tooltip}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${colorClasses}`}
    >
      {found ? (
        <img src="/icons/musicbrainz.svg" alt="" aria-hidden="true" className="h-5 w-5" />
      ) : (
        <WarningIcon className="h-5 w-5" />
      )}
    </a>
  )
}
