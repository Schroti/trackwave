import { config } from 'dotenv'

config()

export const spotifyConfig = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  market: process.env.SPOTIFY_MARKET ?? 'DE',
}

export function assertSpotifyConfigured(): void {
  if (!spotifyConfig.clientId || !spotifyConfig.clientSecret) {
    throw new Error('Spotify provider is enabled but SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET is missing.')
  }
}
