import type { Release } from '../../types'
import { ReleaseCard } from './ReleaseCard'

interface ReleaseGridProps {
  releases: Release[]
}

export function ReleaseGrid({ releases }: ReleaseGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {releases.map((release) => (
        <ReleaseCard key={`${release.artistId}-${release.id}`} release={release} />
      ))}
    </div>
  )
}
