import pLimit from 'p-limit'
import { markFullSyncComplete, setArtistSyncStatus } from '../db/syncStore.js'
import { syncArtistSnapshot } from './artistSync.js'
import type { ProviderId } from '../types.js'

const FOLLOW_SYNC_CONCURRENCY = Math.max(Number(process.env.FOLLOW_SYNC_CONCURRENCY ?? 1), 1)
const syncLimiter = pLimit(FOLLOW_SYNC_CONCURRENCY)
const inFlight = new Set<string>()

interface EnqueueFollowSyncOptions {
  provider: ProviderId
  artistId: string
  followedAt: string
}

function getInFlightKey(provider: ProviderId, artistId: string): string {
  return `${provider}:${artistId}`
}

export function enqueueFollowSync(options: EnqueueFollowSyncOptions): void {
  const { provider, artistId, followedAt } = options
  const inFlightKey = getInFlightKey(provider, artistId)

  if (inFlight.has(inFlightKey)) {
    return
  }

  inFlight.add(inFlightKey)

  void syncLimiter(async () => {
    try {
      setArtistSyncStatus(provider, artistId, 'syncing', null)
      const syncResult = await syncArtistSnapshot({ provider, artistId, followedAt })
      markFullSyncComplete(provider, artistId, syncResult.syncedAt)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync artist in background.'
      setArtistSyncStatus(provider, artistId, 'error', message)
    } finally {
      inFlight.delete(inFlightKey)
    }
  })
}
