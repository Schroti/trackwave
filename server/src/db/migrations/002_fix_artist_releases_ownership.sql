CREATE TABLE artist_releases_new (
  provider TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  release_date TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (provider, artist_id, release_id)
);

INSERT INTO artist_releases_new (provider, release_id, artist_id, release_date, payload_json, updated_at)
SELECT provider, release_id, artist_id, release_date, payload_json, updated_at
FROM artist_releases;

DROP TABLE artist_releases;

ALTER TABLE artist_releases_new RENAME TO artist_releases;

DROP INDEX IF EXISTS idx_artist_releases_provider_artist_date;

CREATE INDEX IF NOT EXISTS idx_artist_releases_provider_artist_date
  ON artist_releases(provider, artist_id, release_date DESC);
