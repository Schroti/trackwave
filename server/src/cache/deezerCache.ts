import path from 'node:path'
import { createSqliteCache } from './sqliteCache.js'

const cacheEnabled = process.env.DEEZER_CACHE_ENABLED !== 'false'
const defaultDbPath = path.resolve(process.cwd(), 'data', 'trackwave-cache.db')
const dbPath = process.env.CACHE_DB_PATH ?? defaultDbPath

const cache = createSqliteCache({ tableName: 'deezer_cache', dbPath, enabled: cacheEnabled })

export function getDeezerCachedPayload<T>(cacheKey: string, maxAgeMs?: number): T | undefined {
  return cache.getFresh<T>(cacheKey, maxAgeMs)
}

export function getDeezerStalePayload<T>(cacheKey: string): T | undefined {
  return cache.getStale<T>(cacheKey)
}

export function setDeezerCachedPayload(cacheKey: string, payload: unknown, ttlMs: number): void {
  cache.set(cacheKey, payload, ttlMs)
}
