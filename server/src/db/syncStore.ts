import { mkdirSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from './migrate.js'
import type { Artist, ProviderId, Release, SyncStatus } from '../types.js'

interface DetailRow {
  payload_json: string
}

interface ReleaseRow {
  payload_json: string
}

interface FollowedArtistRow {
  provider: ProviderId
  artist_id: string
}

export type SyncJobStatus = 'queued' | 'running' | 'done' | 'dead'
export type SyncJobSource = 'follow' | 'nightly' | 'refresh'

export interface SyncJob {
  id: number
  provider: ProviderId
  artistId: string
  source: SyncJobSource
  status: SyncJobStatus
  attempts: number
  nextAttemptAt: string
  createdAt: string
  updatedAt: string
  lastError: string | null
}

interface SyncJobRow {
  id: number
  provider: ProviderId
  artist_id: string
  source: SyncJobSource
  status: SyncJobStatus
  attempts: number
  next_attempt_at: string
  created_at: string
  updated_at: string
  last_error: string | null
}

const defaultDbPath = path.resolve(process.cwd(), 'data', 'trackwave.db')
const dbPath = process.env.TRACKWAVE_DB_PATH ?? defaultDbPath

let db: Database.Database | null = null

function ensureDb(): Database.Database {
  if (db) {
    return db
  }

  const dbDir = path.dirname(dbPath)
  mkdirSync(dbDir, { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  runMigrations(db)

  return db
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function mapSyncJobRow(row: SyncJobRow): SyncJob {
  return {
    id: row.id,
    provider: row.provider,
    artistId: row.artist_id,
    source: row.source,
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastError: row.last_error,
  }
}

export function upsertFollowedArtist(artist: Artist): void {
  const database = ensureDb()
  database
    .prepare(
      `INSERT INTO followed_artists (provider, artist_id, followed_at, sync_status, last_error)
       VALUES (?, ?, ?, 'idle', NULL)
       ON CONFLICT(provider, artist_id) DO UPDATE SET
         sync_status = 'idle',
         last_error = NULL`,
    )
    .run(artist.provider, artist.id, artist.followedAt)
}

export function removeFollowedArtist(provider: ProviderId, artistId: string): void {
  const database = ensureDb()

  const runRemoval = database.transaction((removeProvider: ProviderId, removeArtistId: string) => {
    database
      .prepare('DELETE FROM followed_artists WHERE provider = ? AND artist_id = ?')
      .run(removeProvider, removeArtistId)
    database.prepare('DELETE FROM artist_details WHERE provider = ? AND artist_id = ?').run(removeProvider, removeArtistId)
    database.prepare('DELETE FROM artist_releases WHERE provider = ? AND artist_id = ?').run(removeProvider, removeArtistId)
  })

  runRemoval(provider, artistId)
}

export function isFollowedArtist(provider: ProviderId, artistId: string): boolean {
  const database = ensureDb()
  const row = database
    .prepare('SELECT artist_id FROM followed_artists WHERE provider = ? AND artist_id = ?')
    .get(provider, artistId) as { artist_id: string } | undefined

  return Boolean(row)
}

export function setArtistSyncStatus(
  provider: ProviderId,
  artistId: string,
  syncStatus: SyncStatus,
  lastError: string | null,
): void {
  const database = ensureDb()
  database
    .prepare(
      `UPDATE followed_artists
       SET sync_status = ?, last_error = ?
       WHERE provider = ? AND artist_id = ?`,
    )
    .run(syncStatus, lastError, provider, artistId)
}

export function markFullSyncComplete(provider: ProviderId, artistId: string, syncedAt: string): void {
  const database = ensureDb()
  database
    .prepare(
      `UPDATE followed_artists
       SET sync_status = 'ok',
           last_error = NULL,
           last_full_sync_at = ?,
           last_incremental_sync_at = ?
       WHERE provider = ? AND artist_id = ?`,
    )
    .run(syncedAt, syncedAt, provider, artistId)
}

export function markIncrementalSyncComplete(provider: ProviderId, artistId: string, syncedAt: string): void {
  const database = ensureDb()
  database
    .prepare(
      `UPDATE followed_artists
       SET sync_status = 'ok',
           last_error = NULL,
           last_incremental_sync_at = ?
       WHERE provider = ? AND artist_id = ?`,
    )
    .run(syncedAt, provider, artistId)
}

export function upsertArtistDetail(artist: Artist): void {
  const database = ensureDb()
  const now = new Date().toISOString()

  database
    .prepare(
      `INSERT INTO artist_details (provider, artist_id, payload_json, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(provider, artist_id) DO UPDATE SET
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`,
    )
    .run(artist.provider, artist.id, JSON.stringify(artist), now)
}

export function replaceArtistReleases(provider: ProviderId, artistId: string, releases: Release[]): void {
  const database = ensureDb()
  const now = new Date().toISOString()

  const insertStatement = database.prepare(
    `INSERT INTO artist_releases (provider, release_id, artist_id, release_date, payload_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(provider, artist_id, release_id) DO UPDATE SET
       release_date = excluded.release_date,
       payload_json = excluded.payload_json,
       updated_at = excluded.updated_at`,
  )

  const runReplace = database.transaction((replaceReleases: Release[]) => {
    database.prepare('DELETE FROM artist_releases WHERE provider = ? AND artist_id = ?').run(provider, artistId)

    for (const release of replaceReleases) {
      insertStatement.run(provider, release.id, artistId, release.releaseDate, JSON.stringify(release), now)
    }
  })

  runReplace(releases)
}

export function applySyncResult(provider: ProviderId, artistId: string, artist: Artist, releases: Release[]): void {
  const database = ensureDb()

  const runApply = database.transaction(() => {
    upsertArtistDetail(artist)
    replaceArtistReleases(provider, artistId, releases)
  })

  runApply()
}

export function getArtistDetailSnapshot(provider: ProviderId, artistId: string): Artist | null {
  const database = ensureDb()
  const row = database
    .prepare('SELECT payload_json FROM artist_details WHERE provider = ? AND artist_id = ?')
    .get(provider, artistId) as DetailRow | undefined

  if (!row) {
    return null
  }

  return safeJsonParse<Artist>(row.payload_json)
}

export function getArtistReleasesSnapshot(provider: ProviderId, artistId: string, limit: number | 'all'): Release[] {
  const database = ensureDb()

  const rows =
    limit === 'all'
      ? (database
          .prepare(
            `SELECT payload_json
             FROM artist_releases
             WHERE provider = ? AND artist_id = ?
             ORDER BY release_date DESC`,
          )
          .all(provider, artistId) as ReleaseRow[])
      : (database
          .prepare(
            `SELECT payload_json
             FROM artist_releases
             WHERE provider = ? AND artist_id = ?
             ORDER BY release_date DESC
             LIMIT ?`,
          )
          .all(provider, artistId, limit) as ReleaseRow[])

  return rows
    .map((row) => safeJsonParse<Release>(row.payload_json))
    .filter((value): value is Release => value !== null)
}

export function getFollowedArtistsForSync(): Array<{ provider: ProviderId; artistId: string }> {
  const database = ensureDb()
  const rows = database
    .prepare('SELECT provider, artist_id FROM followed_artists ORDER BY followed_at ASC')
    .all() as FollowedArtistRow[]

  return rows.map((row) => ({
    provider: row.provider,
    artistId: row.artist_id,
  }))
}

export function getFollowedArtistsWithDetail(): Artist[] {
  const database = ensureDb()
  const rows = database
    .prepare(
      `SELECT fa.provider AS provider, fa.artist_id AS artist_id, ad.payload_json AS payload_json
       FROM followed_artists fa
       LEFT JOIN artist_details ad ON ad.provider = fa.provider AND ad.artist_id = fa.artist_id
       ORDER BY fa.followed_at ASC`,
    )
    .all() as Array<{ provider: ProviderId; artist_id: string; payload_json: string | null }>

  return rows
    .map((row) => (row.payload_json ? safeJsonParse<Artist>(row.payload_json) : null))
    .filter((value): value is Artist => value !== null)
}

export function getStuckSyncingArtists(): Array<{ provider: ProviderId; artistId: string }> {
  const database = ensureDb()
  const rows = database
    .prepare("SELECT provider, artist_id FROM followed_artists WHERE sync_status = 'syncing'")
    .all() as FollowedArtistRow[]

  return rows.map((row) => ({ provider: row.provider, artistId: row.artist_id }))
}

export function findActiveSyncJob(provider: ProviderId, artistId: string): SyncJob | null {
  const database = ensureDb()
  const row = database
    .prepare(
      `SELECT * FROM sync_jobs
       WHERE provider = ? AND artist_id = ? AND status IN ('queued', 'running')
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get(provider, artistId) as SyncJobRow | undefined

  return row ? mapSyncJobRow(row) : null
}

export function insertSyncJob(provider: ProviderId, artistId: string, source: SyncJobSource): SyncJob {
  const database = ensureDb()
  const now = new Date().toISOString()

  const result = database
    .prepare(
      `INSERT INTO sync_jobs (provider, artist_id, source, status, attempts, next_attempt_at, created_at, updated_at, last_error)
       VALUES (?, ?, ?, 'queued', 0, ?, ?, ?, NULL)`,
    )
    .run(provider, artistId, source, now, now, now)

  return mapSyncJobRow(
    database.prepare('SELECT * FROM sync_jobs WHERE id = ?').get(result.lastInsertRowid) as SyncJobRow,
  )
}

export function claimNextQueuedJob(): SyncJob | null {
  const database = ensureDb()
  const now = new Date().toISOString()

  const claim = database.transaction((claimNow: string): SyncJob | null => {
    const candidate = database
      .prepare(
        `SELECT * FROM sync_jobs
         WHERE status = 'queued' AND next_attempt_at <= ?
         ORDER BY next_attempt_at ASC
         LIMIT 1`,
      )
      .get(claimNow) as SyncJobRow | undefined

    if (!candidate) {
      return null
    }

    database
      .prepare("UPDATE sync_jobs SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'")
      .run(claimNow, candidate.id)

    return mapSyncJobRow({ ...candidate, status: 'running', updated_at: claimNow })
  })

  return claim(now)
}

export function claimSyncJobById(id: number): SyncJob | null {
  const database = ensureDb()
  const now = new Date().toISOString()

  const claim = database.transaction((claimId: number, claimNow: string): SyncJob | null => {
    const result = database
      .prepare("UPDATE sync_jobs SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'")
      .run(claimNow, claimId)

    if (result.changes === 0) {
      return null
    }

    return mapSyncJobRow(database.prepare('SELECT * FROM sync_jobs WHERE id = ?').get(claimId) as SyncJobRow)
  })

  return claim(id, now)
}

export function markSyncJobDone(id: number): void {
  const database = ensureDb()
  const now = new Date().toISOString()
  database.prepare("UPDATE sync_jobs SET status = 'done', updated_at = ? WHERE id = ?").run(now, id)
}

const MAX_SYNC_JOB_ATTEMPTS = 5
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000]

function computeNextAttemptDelayMs(attempts: number): number {
  return RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]
}

export function markSyncJobFailed(id: number, attempts: number, message: string): void {
  const database = ensureDb()
  const now = new Date()
  const nowIso = now.toISOString()

  if (attempts >= MAX_SYNC_JOB_ATTEMPTS) {
    database
      .prepare("UPDATE sync_jobs SET status = 'dead', attempts = ?, last_error = ?, updated_at = ? WHERE id = ?")
      .run(attempts, message, nowIso, id)
    return
  }

  const nextAttemptAt = new Date(now.getTime() + computeNextAttemptDelayMs(attempts)).toISOString()

  database
    .prepare(
      `UPDATE sync_jobs
       SET status = 'queued', attempts = ?, last_error = ?, next_attempt_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(attempts, message, nextAttemptAt, nowIso, id)
}

export function resetInterruptedSyncJobs(): SyncJob[] {
  const database = ensureDb()
  const now = new Date().toISOString()

  const reset = database.transaction((resetNow: string): SyncJob[] => {
    const stuck = database.prepare("SELECT * FROM sync_jobs WHERE status = 'running'").all() as SyncJobRow[]

    database
      .prepare("UPDATE sync_jobs SET status = 'queued', next_attempt_at = ?, updated_at = ? WHERE status = 'running'")
      .run(resetNow, resetNow)

    return stuck.map((row) => mapSyncJobRow({ ...row, status: 'queued', next_attempt_at: resetNow, updated_at: resetNow }))
  })

  return reset(now)
}
