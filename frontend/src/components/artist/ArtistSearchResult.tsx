import { useState } from 'react'
import { useArtistStore } from '../../store/useArtistStore'
import type { Artist } from '../../types'
import { FollowButton } from '../ui/FollowButton'

interface ArtistSearchResultProps {
  artist: Artist
}

export function ArtistSearchResult({ artist }: ArtistSearchResultProps) {
  const followArtist = useArtistStore((state) => state.followArtist)
  const unfollowArtist = useArtistStore((state) => state.unfollowArtist)
  const isFollowing = useArtistStore((state) => state.isFollowing(artist.id))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleToggle = async () => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)

    try {
      if (isFollowing) {
        await unfollowArtist(artist.id)
        return
      }

      await followArtist(artist)
    } finally {
      setIsSubmitting(false)
    }
  }

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
        </div>

        <FollowButton isFollowing={isFollowing} onClick={() => void handleToggle()} />
      </div>
    </article>
  )
}
