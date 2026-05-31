export type ProviderId = 'spotify' | 'deezer'
export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

export interface Artist {
  id: string
  name: string
  imageUrl?: string
  genres: string[]
  followedAt: string
  provider: ProviderId
  externalUrl: string
  spotifyUrl: string
}

export type ReleaseType = 'album' | 'single' | 'compilation'
export type ReleaseDatePrecision = 'year' | 'month' | 'day'

export interface Release {
  id: string
  artistId: string
  artistName: string
  title: string
  type: ReleaseType
  releaseDate: string
  releaseDatePrecision: ReleaseDatePrecision
  coverUrl: string
  provider: ProviderId
  externalUrl: string
  spotifyUrl: string
  totalTracks: number
}
