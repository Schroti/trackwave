import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

interface CacheRow {
  payload: string
  expires_at: number
  created_at: number
}

const cacheEnabled = process.env.DEEZER_CACHE_ENABLED !== 'false'
const defaultDbPath = path.resolve(process.cwd(), 'data', 'trackwave-cache.db')
const dbPath = process.env.CACHE_DB_PATH ?? defaultDbPath

let db: Database.Database | null = null
let selectFreshStatement:
  | {
      get: (key: string, now: number) => CacheRow | undefined
    }
  | null = null
let selectAnyStatement:
  | {
      get: (key: string) => CacheRow | undefined
    }
  | null = null
let upsertStatement:
  | {
      run: (key: string, payload: string, expiresAt: number, createdAt: number) => void
    }
  | null = null
let purgeExpiredStatement:
  | {
      run: (now: number) => void
    }
  | null = null
let writeCounter = 0

function ensureDb(): Database.Database | null {
  if (!cacheEnabled) {
    return null
  }

  if (db) {
    return db
  }

  const dbDir = path.dirname(dbPath)
  mkdirSync(dbDir, { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS deezer_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_deezer_cache_expires_at ON deezer_cache(expires_at);
  `)

  selectFreshStatement = db.prepare(
    'SELECT payload, expires_at, created_at FROM deezer_cache WHERE cache_key = ? AND expires_at > ?',
  ) as typeof selectFreshStatement
  selectAnyStatement = db.prepare(
    'SELECT payload, expires_at, created_at FROM deezer_cache WHERE cache_key = ?',
  ) as typeof selectAnyStatement
  upsertStatement = db.prepare(
    `INSERT INTO deezer_cache (cache_key, payload, expires_at, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET
       payload = excluded.payload,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at`,
  ) as typeof upsertStatement
  purgeExpiredStatement = db.prepare('DELETE FROM deezer_cache WHERE expires_at <= ?') as typeof purgeExpiredStatement

  return db
}

function parsePayload<T>(row: CacheRow | undefined): T | undefined {
  if (!row) {
    return undefined
  }

  try {
    return JSON.parse(row.payload) as T
  } catch {
    return undefined
  }
}

export function getDeezerCachedPayload<T>(cacheKey: string, maxAgeMs?: number): T | undefined {
  if (!ensureDb() || !selectFreshStatement) {
    return undefined
  }

  const now = Date.now()
  const row = selectFreshStatement.get(cacheKey, now)

  if (maxAgeMs !== undefined && row && now - row.created_at > maxAgeMs) {
    return undefined
  }

  return parsePayload<T>(row)
}

export function getDeezerStalePayload<T>(cacheKey: string): T | undefined {
  if (!ensureDb() || !selectAnyStatement) {
    return undefined
  }

  return parsePayload<T>(selectAnyStatement.get(cacheKey))
}

export function setDeezerCachedPayload(cacheKey: string, payload: unknown, ttlMs: number): void {
  if (!ensureDb() || !upsertStatement) {
    return
  }

  const now = Date.now()
  const expiresAt = now + ttlMs
  const serialized = JSON.stringify(payload)
  upsertStatement.run(cacheKey, serialized, expiresAt, now)

  writeCounter += 1

  if (writeCounter % 50 === 0 && purgeExpiredStatement) {
    purgeExpiredStatement.run(now)
  }
}
