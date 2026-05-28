import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useArtistStore } from '../../store/useArtistStore'
import type { Artist } from '../../types'
import { FollowButton } from '../ui/FollowButton'

interface ArtistCardProps {
  artist: Artist
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const { t } = useLanguage()
  const unfollowArtist = useArtistStore((state) => state.unfollowArtist)

  return (
    <article className="glass-panel rounded-2xl p-4">
      <div className="flex items-center gap-4">
        {artist.imageUrl ? (
          <img
            src={artist.imageUrl}
            alt={artist.name}
            className="h-16 w-16 rounded-xl object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-700">
            {artist.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-slate-900">{artist.name}</h3>
          <p className="truncate text-sm text-slate-600">{artist.genres.join(', ') || '—'}</p>
          <Link to={`/artist/${artist.id}`} className="text-xs font-semibold text-cyan-700 hover:text-cyan-500">
            {t('artists.details')}
          </Link>
        </div>

        <FollowButton isFollowing onClick={() => unfollowArtist(artist.id)} />
      </div>
    </article>
  )
}
