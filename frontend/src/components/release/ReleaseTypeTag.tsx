import { useLanguage } from '../../contexts/LanguageContext'
import type { ReleaseType } from '../../types'

interface ReleaseTypeTagProps {
  type: ReleaseType
}

const colorByType: Record<ReleaseType, string> = {
  album: 'bg-emerald-100 text-emerald-800',
  single: 'bg-amber-100 text-amber-800',
  compilation: 'bg-indigo-100 text-indigo-800',
}

export function ReleaseTypeTag({ type }: ReleaseTypeTagProps) {
  const { t } = useLanguage()

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colorByType[type]}`}>
      {t(`release.${type}`)}
    </span>
  )
}
