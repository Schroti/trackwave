import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type Database from 'better-sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, 'migrations')

interface MigrationRow {
  id: string
}

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = new Set(
    (db.prepare('SELECT id FROM schema_migrations').all() as MigrationRow[]).map((row) => row.id),
  )

  const pendingFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .filter((file) => !applied.has(file.replace(/\.sql$/, '')))

  const recordMigration = db.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')

  for (const file of pendingFiles) {
    const id = file.replace(/\.sql$/, '')
    const sql = readFileSync(path.join(migrationsDir, file), 'utf8')

    const applyMigration = db.transaction(() => {
      db.exec(sql)
      recordMigration.run(id, new Date().toISOString())
    })

    applyMigration()
  }
}
