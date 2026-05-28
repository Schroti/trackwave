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
- Deezer API responses are cached in a persistent SQLite file (`CACHE_DB_PATH`) to reduce quota pressure and survive restarts.
