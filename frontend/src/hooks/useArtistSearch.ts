import { useEffect, useState } from 'react'
import { searchArtists } from '../services/api'
import type { Artist } from '../types'
import { useDebouncedValue } from './useDebouncedValue'

interface UseArtistSearchResult {
  artists: Artist[]
  isLoading: boolean
  error: string | null
}

export function useArtistSearch(query: string): UseArtistSearchResult {
  const debouncedQuery = useDebouncedValue(query.trim())
  const [artists, setArtists] = useState<Artist[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!debouncedQuery) {
      setArtists([])
      setError(null)
      return
    }

    let active = true

    const run = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await searchArtists(debouncedQuery)

        if (active) {
          setArtists(result)
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unknown error')
          setArtists([])
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      active = false
    }
  }, [debouncedQuery])

  return { artists, isLoading, error }
}
