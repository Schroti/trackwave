import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Artist } from '../types'

interface ArtistStoreState {
  followedArtists: Artist[]
  monthsFilter: number
  followArtist: (artist: Artist) => void
  unfollowArtist: (artistId: string) => void
  isFollowing: (artistId: string) => boolean
  setMonthsFilter: (months: number) => void
}

export const useArtistStore = create<ArtistStoreState>()(
  persist(
    (set, get) => ({
      followedArtists: [],
      monthsFilter: 6,
      followArtist: (artist) => {
        const exists = get().followedArtists.some((entry) => entry.id === artist.id)

        if (exists) {
          return
        }

        set((state) => ({
          followedArtists: [
            ...state.followedArtists,
            {
              ...artist,
              provider: artist.provider,
              externalUrl: artist.externalUrl,
              spotifyUrl: artist.spotifyUrl,
              followedAt: new Date().toISOString(),
            },
          ],
        }))
      },
      unfollowArtist: (artistId) => {
        set((state) => ({
          followedArtists: state.followedArtists.filter((artist) => artist.id !== artistId),
        }))
      },
      isFollowing: (artistId) => get().followedArtists.some((artist) => artist.id === artistId),
      setMonthsFilter: (months) => set({ monthsFilter: months }),
    }),
    {
      name: 'trackwave-artists',
      partialize: (state) => ({
        followedArtists: state.followedArtists,
        monthsFilter: state.monthsFilter,
      }),
    },
  ),
)
