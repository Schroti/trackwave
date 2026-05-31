import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Artist } from '../types'
import { followArtist as followArtistRequest, type MusicProvider, unfollowArtist as unfollowArtistRequest } from '../services/api'

interface ArtistStoreState {
  followedArtists: Artist[]
  selectedProvider: MusicProvider
  monthsFilter: number
  followArtist: (artist: Artist) => Promise<void>
  unfollowArtist: (artistId: string) => Promise<void>
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
      followArtist: async (artist) => {
        const exists = get().followedArtists.some((entry) => entry.id === artist.id)

        if (exists) {
          return
        }

        const persistedArtist = await followArtistRequest(artist)

        set((state) => ({
          followedArtists: [
            ...state.followedArtists,
            {
              ...persistedArtist,
              followedAt: persistedArtist.followedAt || new Date().toISOString(),
            },
          ],
        }))
      },
      unfollowArtist: async (artistId) => {
        const artist = get().followedArtists.find((entry) => entry.id === artistId)

        if (artist) {
          await unfollowArtistRequest(artistId, artist.provider)
        }

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
