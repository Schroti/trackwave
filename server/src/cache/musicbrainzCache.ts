import path from 'node:path'
import { createSqliteCache } from './sqliteCache.js'

const cacheEnabled = process.env.MUSICBRAINZ_CACHE_ENABLED !== 'false'
const defaultDbPath = path.resolve(process.cwd(), 'data', 'trackwave-cache.db')
const dbPath = process.env.CACHE_DB_PATH ?? defaultDbPath

const cache = createSqliteCache({ tableName: 'musicbrainz_cache', dbPath, enabled: cacheEnabled })

export function getMusicbrainzCachedPayload<T>(cacheKey: string, maxAgeMs?: number): T | undefined {
  return cache.getFresh<T>(cacheKey, maxAgeMs)
}

export function setMusicbrainzCachedPayload(cacheKey: string, payload: unknown, ttlMs: number): void {
  cache.set(cacheKey, payload, ttlMs)
}
