import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

interface CacheRow {
  payload: string
  expires_at: number
  created_at: number
}

export interface SqliteCache {
  getFresh<T>(cacheKey: string, maxAgeMs?: number): T | undefined
  getStale<T>(cacheKey: string): T | undefined
  set(cacheKey: string, payload: unknown, ttlMs: number): void
}

interface CreateSqliteCacheOptions {
  tableName: string
  dbPath: string
  enabled: boolean
}

export function createSqliteCache(options: CreateSqliteCacheOptions): SqliteCache {
  const { tableName, dbPath, enabled } = options

  let db: Database.Database | null = null
  let selectFreshStatement: Database.Statement | null = null
  let selectAnyStatement: Database.Statement | null = null
  let upsertStatement: Database.Statement | null = null
  let purgeExpiredStatement: Database.Statement | null = null
  let writeCounter = 0

  function ensureDb(): Database.Database | null {
    if (!enabled) {
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
      CREATE TABLE IF NOT EXISTS ${tableName} (
        cache_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_${tableName}_expires_at ON ${tableName}(expires_at);
    `)

    selectFreshStatement = db.prepare(
      `SELECT payload, expires_at, created_at FROM ${tableName} WHERE cache_key = ? AND expires_at > ?`,
    )
    selectAnyStatement = db.prepare(`SELECT payload, expires_at, created_at FROM ${tableName} WHERE cache_key = ?`)
    upsertStatement = db.prepare(
      `INSERT INTO ${tableName} (cache_key, payload, expires_at, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(cache_key) DO UPDATE SET
         payload = excluded.payload,
         expires_at = excluded.expires_at,
         created_at = excluded.created_at`,
    )
    purgeExpiredStatement = db.prepare(`DELETE FROM ${tableName} WHERE expires_at <= ?`)

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

  return {
    getFresh<T>(cacheKey: string, maxAgeMs?: number): T | undefined {
      if (!ensureDb() || !selectFreshStatement) {
        return undefined
      }

      const now = Date.now()
      const row = selectFreshStatement.get(cacheKey, now) as CacheRow | undefined

      if (maxAgeMs !== undefined && row && now - row.created_at > maxAgeMs) {
        return undefined
      }

      return parsePayload<T>(row)
    },

    getStale<T>(cacheKey: string): T | undefined {
      if (!ensureDb() || !selectAnyStatement) {
        return undefined
      }

      return parsePayload<T>(selectAnyStatement.get(cacheKey) as CacheRow | undefined)
    },

    set(cacheKey: string, payload: unknown, ttlMs: number): void {
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
    },
  }
}
