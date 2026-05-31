import pLimit from 'p-limit'
import {
  getFollowedArtistsForSync,
  markIncrementalSyncComplete,
  setArtistSyncStatus,
} from '../db/syncStore.js'
import { syncArtistSnapshot } from './artistSync.js'

const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== 'false'
const SCHEDULER_TIMEZONE = process.env.SCHEDULER_TIMEZONE ?? 'Europe/Berlin'
const SCHEDULER_DAILY_TIME = process.env.SCHEDULER_DAILY_TIME ?? '00:15'
const SCHEDULER_CONCURRENCY = Math.max(Number(process.env.SCHEDULER_CONCURRENCY ?? 2), 1)

let intervalHandle: NodeJS.Timeout | null = null
let isRunning = false
let lastRunDate: string | null = null

function getTimeZoneParts(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''

  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  }
}

function parseDailyTime(value: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid SCHEDULER_DAILY_TIME value: ${value}`)
  }

  return { hour, minute }
}

async function runNightlySync(): Promise<void> {
  if (isRunning) {
    return
  }

  isRunning = true

  try {
    const followedArtists = getFollowedArtistsForSync()

    if (!followedArtists.length) {
      return
    }

    const limiter = pLimit(SCHEDULER_CONCURRENCY)

    await Promise.all(
      followedArtists.map((item) =>
        limiter(async () => {
          setArtistSyncStatus(item.provider, item.artistId, 'syncing', null)

          try {
            const syncResult = await syncArtistSnapshot({
              provider: item.provider,
              artistId: item.artistId,
            })
            markIncrementalSyncComplete(item.provider, item.artistId, syncResult.syncedAt)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown sync error'
            setArtistSyncStatus(item.provider, item.artistId, 'error', message)
          }
        }),
      ),
    )
  } finally {
    isRunning = false
  }
}

export function startNightlyScheduler(): void {
  if (!SCHEDULER_ENABLED || intervalHandle) {
    return
  }

  const { hour, minute } = parseDailyTime(SCHEDULER_DAILY_TIME)

  const maybeRun = () => {
    const now = new Date()
    const local = getTimeZoneParts(now, SCHEDULER_TIMEZONE)

    if (local.hour !== hour || local.minute !== minute) {
      return
    }

    if (lastRunDate === local.dateKey) {
      return
    }

    lastRunDate = local.dateKey
    void runNightlySync()
  }

  maybeRun()
  intervalHandle = setInterval(maybeRun, 60 * 1000)
}
