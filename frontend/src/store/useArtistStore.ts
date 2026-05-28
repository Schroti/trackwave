import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Artist } from '../types'
import type { MusicProvider } from '../services/api'

interface ArtistStoreState {
  followedArtists: Artist[]
  selectedProvider: MusicProvider
  monthsFilter: number
  followArtist: (artist: Artist) => void
  unfollowArtist: (artistId: string) => void
  isFollowing: (artistId: string) => boolean
  setMonthsFilter: (months: number) => void
  setSelectedProvider: (provider: MusicProvider) => void
}

export const useArtistStore = create<ArtistStoreState>()(
  persist(
    (set, get) => ({
      followedArtists: [],
      selectedProvider: 'deezer',
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
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
    }),
    {
      name: 'trackwave-artists',
      partialize: (state) => ({
        followedArtists: state.followedArtists,
        selectedProvider: state.selectedProvider,
        monthsFilter: state.monthsFilter,
      }),
    },
  ),
)
