import type { Artist } from '../../types'
import { ArtistCard } from './ArtistCard'

interface ArtistListProps {
  artists: Artist[]
}

export function ArtistList({ artists }: ArtistListProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {artists.map((artist) => (
        <ArtistCard key={artist.id} artist={artist} />
      ))}
    </div>
  )
}
