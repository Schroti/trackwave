import { useLanguage } from '../../contexts/LanguageContext'

interface FollowButtonProps {
  isFollowing: boolean
  onClick: () => void
}

export function FollowButton({ isFollowing, onClick }: FollowButtonProps) {
  const { t } = useLanguage()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
        isFollowing
          ? 'bg-slate-900 text-white hover:bg-slate-700'
          : 'bg-cyan-500 text-white hover:bg-cyan-400'
      }`}
    >
      {isFollowing ? t('actions.unfollow') : t('actions.follow')}
    </button>
  )
}
