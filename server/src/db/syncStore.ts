import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
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

const defaultDbPath = path.resolve(process.cwd(), 'data', 'trackwave.db')
const dbPath = process.env.TRACKWAVE_DB_PATH ?? defaultDbPath

let db: DatabaseSync | null = null

function ensureDb(): DatabaseSync {
  if (db) {
    return db
  }

  const dbDir = path.dirname(dbPath)
  mkdirSync(dbDir, { recursive: true })

  db = new DatabaseSync(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS followed_artists (
      provider TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      followed_at TEXT NOT NULL,
      last_full_sync_at TEXT,
      last_incremental_sync_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'idle',
      last_error TEXT,
      PRIMARY KEY (provider, artist_id)
    );

    CREATE TABLE IF NOT EXISTS artist_details (
      provider TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (provider, artist_id)
    );

    CREATE TABLE IF NOT EXISTS artist_releases (
      provider TEXT NOT NULL,
      release_id TEXT NOT NULL,
      artist_id TEXT NOT NULL,
      release_date TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (provider, release_id)
    );

    CREATE INDEX IF NOT EXISTS idx_artist_releases_provider_artist_date
      ON artist_releases(provider, artist_id, release_date DESC);
  `)

  return db
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function upsertFollowedArtist(artist: Artist): void {
  const database = ensureDb()
  const statement = database.prepare(`
    INSERT INTO followed_artists (provider, artist_id, followed_at, sync_status, last_error)
    VALUES (?, ?, ?, 'idle', NULL)
    ON CONFLICT(provider, artist_id) DO UPDATE SET
      sync_status = 'idle',
      last_error = NULL
  `)

  statement.run(artist.provider, artist.id, artist.followedAt)
}

export function removeFollowedArtist(provider: ProviderId, artistId: string): void {
  const database = ensureDb()
  database.exec('BEGIN')

  try {
    database
      .prepare('DELETE FROM followed_artists WHERE provider = ? AND artist_id = ?')
      .run(provider, artistId)
    database.prepare('DELETE FROM artist_details WHERE provider = ? AND artist_id = ?').run(provider, artistId)
    database.prepare('DELETE FROM artist_releases WHERE provider = ? AND artist_id = ?').run(provider, artistId)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

export function isFollowedArtist(provider: ProviderId, artistId: string): boolean {
  const database = ensureDb()
  const row = database
    .prepare('SELECT artist_id FROM followed_artists WHERE provider = ? AND artist_id = ?')
    .get(provider, artistId) as unknown as { artist_id: string } | undefined

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

  database.exec('BEGIN')

  try {
    database.prepare('DELETE FROM artist_releases WHERE provider = ? AND artist_id = ?').run(provider, artistId)

    const insertStatement = database.prepare(
      `INSERT INTO artist_releases (provider, release_id, artist_id, release_date, payload_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(provider, release_id) DO UPDATE SET
         artist_id = excluded.artist_id,
         release_date = excluded.release_date,
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at`,
    )

    for (const release of releases) {
      insertStatement.run(provider, release.id, artistId, release.releaseDate, JSON.stringify(release), now)
    }

    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
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
          .all(provider, artistId) as unknown as ReleaseRow[])
      : (database
          .prepare(
            `SELECT payload_json
             FROM artist_releases
             WHERE provider = ? AND artist_id = ?
             ORDER BY release_date DESC
             LIMIT ?`,
          )
           .all(provider, artistId, limit) as unknown as ReleaseRow[])

  return rows
    .map((row) => safeJsonParse<Release>(row.payload_json))
    .filter((value): value is Release => value !== null)
}

export function getFollowedArtistsForSync(): Array<{ provider: ProviderId; artistId: string }> {
  const database = ensureDb()
  const rows = database
    .prepare('SELECT provider, artist_id FROM followed_artists ORDER BY followed_at ASC')
    .all() as unknown as FollowedArtistRow[]

  return rows.map((row) => ({
    provider: row.provider,
    artistId: row.artist_id,
  }))
}
