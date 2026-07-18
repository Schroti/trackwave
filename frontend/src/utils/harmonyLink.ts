import type { Release } from '../types'

export function buildHarmonyReleaseLink(release: Release): string {
  const deezerId = release.provider === 'deezer' ? release.id : ''
  const spotifyId = release.provider === 'spotify' ? release.id : ''

  return `https://harmony.pulsewidth.org.uk/release?region=GB,US,JP,DE&musicbrainz=&deezer=${deezerId}&itunes=&spotify=${spotifyId}&tidal=`
}
