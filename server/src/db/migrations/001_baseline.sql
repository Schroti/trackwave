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
