import { useLanguage } from '../../contexts/LanguageContext'

interface FollowButtonProps {
  isFollowing: boolean
  onClick: () => void
  isLoading?: boolean
}

export function FollowButton({ isFollowing, onClick, isLoading = false }: FollowButtonProps) {
  const { t } = useLanguage()

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        isFollowing
          ? 'bg-slate-900 text-white hover:bg-slate-700'
          : 'bg-cyan-500 text-white hover:bg-cyan-400'
      } ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
        {isFollowing ? t('actions.unfollow') : t('actions.follow')}
      </span>
    </button>
  )
}
