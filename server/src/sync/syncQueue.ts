import {
  claimNextQueuedJob,
  claimSyncJobById,
  findActiveSyncJob,
  getStuckSyncingArtists,
  insertSyncJob,
  markFullSyncComplete,
  markIncrementalSyncComplete,
  markSyncJobDone,
  markSyncJobFailed,
  resetInterruptedSyncJobs,
  setArtistSyncStatus,
  type SyncJob,
  type SyncJobSource,
} from '../db/syncStore.js'
import { syncArtistSnapshot, type SyncArtistSnapshotResult } from './artistSync.js'
import type { ProviderId } from '../types.js'

const SYNC_WORKER_CONCURRENCY = Math.max(Number(process.env.SYNC_WORKER_CONCURRENCY ?? 2), 1)

const inFlight = new Map<string, Promise<SyncArtistSnapshotResult>>()
let activeWorkers = 0

function jobKey(provider: ProviderId, artistId: string): string {
  return `${provider}:${artistId}`
}

function executeAndTrack(job: SyncJob): Promise<SyncArtistSnapshotResult> {
  const key = jobKey(job.provider, job.artistId)

  const promise = (async (): Promise<SyncArtistSnapshotResult> => {
    setArtistSyncStatus(job.provider, job.artistId, 'syncing', null)

    try {
      const result = await syncArtistSnapshot({ provider: job.provider, artistId: job.artistId })
      markSyncJobDone(job.id)

      if (job.source === 'nightly') {
        markIncrementalSyncComplete(job.provider, job.artistId, result.syncedAt)
      } else {
        markFullSyncComplete(job.provider, job.artistId, result.syncedAt)
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync artist.'
      markSyncJobFailed(job.id, job.attempts + 1, message)
      setArtistSyncStatus(job.provider, job.artistId, 'error', message)
      throw error
    }
  })()

  inFlight.set(key, promise)
  promise.finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key)
    }
  })

  return promise
}

function pump(): void {
  while (activeWorkers < SYNC_WORKER_CONCURRENCY) {
    const job = claimNextQueuedJob()

    if (!job) {
      return
    }

    const key = jobKey(job.provider, job.artistId)
    const existing = inFlight.get(key)

    if (existing) {
      existing.then(
        () => markSyncJobDone(job.id),
        (error) => markSyncJobFailed(job.id, job.attempts + 1, error instanceof Error ? error.message : String(error)),
      )
      continue
    }

    activeWorkers += 1
    executeAndTrack(job)
      .catch(() => {
        // Failure is already recorded by executeAndTrack; swallow here so it doesn't surface as an unhandled rejection.
      })
      .finally(() => {
        activeWorkers -= 1
        pump()
      })
  }
}

export function enqueueSync(provider: ProviderId, artistId: string, source: SyncJobSource): void {
  const key = jobKey(provider, artistId)

  if (inFlight.has(key) || findActiveSyncJob(provider, artistId)) {
    return
  }

  insertSyncJob(provider, artistId, source)
  pump()
}

const MAX_RUN_NOW_ATTEMPTS = 3

export async function runSyncNow(provider: ProviderId, artistId: string): Promise<SyncArtistSnapshotResult> {
  const key = jobKey(provider, artistId)

  for (let attempt = 0; attempt < MAX_RUN_NOW_ATTEMPTS; attempt += 1) {
    const existing = inFlight.get(key)

    if (existing) {
      return existing
    }

    const activeJob = findActiveSyncJob(provider, artistId)

    if (activeJob && activeJob.status !== 'queued') {
      // A job is marked running with no tracked in-flight promise for it (should only
      // happen in the brief window of a concurrent claim). Back off and retry the check.
      continue
    }

    const claimedJob = activeJob
      ? claimSyncJobById(activeJob.id)
      : claimSyncJobById(insertSyncJob(provider, artistId, 'refresh').id)

    if (claimedJob) {
      return executeAndTrack(claimedJob)
    }
  }

  const raced = inFlight.get(key)

  if (raced) {
    return raced
  }

  throw new Error(`Could not start sync for ${key}: a sync appears to already be in progress.`)
}

export function recoverInterruptedSyncs(): void {
  resetInterruptedSyncJobs()

  for (const { provider, artistId } of getStuckSyncingArtists()) {
    setArtistSyncStatus(provider, artistId, 'error', 'Interrupted by restart')
  }

  pump()
}
