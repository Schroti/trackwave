# Trackwave

Trackwave is a release tracker for followed artists.

## Architecture

- frontend: React + Vite + TypeScript + Tailwind + Zustand
- server: Node + Express BFF with provider abstraction (Deezer default, Spotify optional)
- deployment: single Docker container (server serves frontend static build)

## Development

1. Install dependencies:
   - `cd frontend && npm install`
   - `cd ../server && npm install`
2. Create `.env` in project root based on `.env.example`.
   - default provider is Deezer and works without Spotify credentials
   - Spotify credentials are optional and only required if you explicitly use provider `spotify`
3. Run frontend and server in separate terminals:
   - `npm run dev:server` (in root)
   - `npm run dev:frontend` (in root)
4. Open http://localhost:5173

## Production With Docker

1. Add `.env` file in root.
   - Deezer default works out of the box
   - Spotify credentials can be added optionally for dual-provider support
2. Build and run:
   - `docker compose up --build -d`
3. App runs on http://localhost:8787

## Notes

- Deezer is used as default provider to avoid premium-account dependency.
- Spotify secrets stay on the server side only and are optional.
- Browser talks only to `/api` routes exposed by the BFF.
- Followed artists are persisted server-side in SQLite (`TRACKWAVE_DB_PATH`) and no longer only in browser state.
- Following a new artist triggers an immediate full sync (artist detail + full release history) and stores the snapshot.
- Existing followed artists are refreshed daily by the built-in scheduler (`SCHEDULER_DAILY_TIME`, default `00:15` in `Europe/Berlin`).
- Deezer API responses are cached in a persistent SQLite file (`CACHE_DB_PATH`) to reduce quota pressure and survive restarts.
- Deezer outbound requests are globally hard-throttled to 50 requests per 5 seconds.
- Artist album lists use a short cache freshness window (`DEEZER_ARTIST_ALBUMS_MAX_AGE_MS`, default 5 minutes) so brand-new releases appear quickly.
- Artist detail data is available via `/api/artists/:id/detail`, and detail pages load full release history grouped by type (bounded by `DEEZER_MAX_RELEASES` / `SPOTIFY_MAX_RELEASES`).
