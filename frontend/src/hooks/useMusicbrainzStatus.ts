import { useEffect, useState } from 'react'
import { getMusicbrainzStatus, type MusicbrainzStatus } from '../services/api'

interface UseMusicbrainzStatusResult {
  status: MusicbrainzStatus | null
}

// MusicBrainz being briefly unreachable (or not having indexed something yet) is expected and
// non-critical, unlike the rest of this app's API calls — so failures here never surface as a
// user-facing error, they just mean no badge is shown (status stays null).
export function useMusicbrainzStatus(
  url: string | undefined,
  entity: 'release' | 'artist',
  enabled: boolean,
): UseMusicbrainzStatusResult {
  const [status, setStatus] = useState<MusicbrainzStatus | null>(null)

  useEffect(() => {
    if (!enabled || !url) {
      return
    }

    let cancelled = false

    getMusicbrainzStatus(url, entity)
      .then((result) => {
        if (!cancelled) {
          setStatus(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [url, entity, enabled])

  return { status }
}
