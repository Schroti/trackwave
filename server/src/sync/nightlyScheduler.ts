import { getFollowedArtistsForSync } from '../db/syncStore.js'
import { enqueueSync } from './syncQueue.js'

const SCHEDULER_ENABLED = process.env.SCHEDULER_ENABLED !== 'false'
const SCHEDULER_TIMEZONE = process.env.SCHEDULER_TIMEZONE ?? 'Europe/Berlin'
const SCHEDULER_DAILY_TIME = process.env.SCHEDULER_DAILY_TIME ?? '00:15'

let intervalHandle: NodeJS.Timeout | null = null
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

function runNightlySync(): void {
  const followedArtists = getFollowedArtistsForSync()

  for (const item of followedArtists) {
    enqueueSync(item.provider, item.artistId, 'nightly')
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
    runNightlySync()
  }

  maybeRun()
  intervalHandle = setInterval(maybeRun, 60 * 1000)
}
