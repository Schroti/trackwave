import { assertSpotifyConfigured, spotifyConfig } from './config.js'

interface CachedToken {
  value: string
  expiresAt: number
}

const EXPIRY_BUFFER_MS = 60_000
let cachedToken: CachedToken | null = null

export async function getSpotifyAccessToken(): Promise<string> {
  assertSpotifyConfigured()

  if (cachedToken && Date.now() < cachedToken.expiresAt - EXPIRY_BUFFER_MS) {
    return cachedToken.value
  }

  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${spotifyConfig.clientId}:${spotifyConfig.clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text()
    throw new Error(`Failed to fetch Spotify token: ${tokenResponse.status} ${details}`)
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string
    expires_in: number
  }

  cachedToken = {
    value: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  }

  return cachedToken.value
}
