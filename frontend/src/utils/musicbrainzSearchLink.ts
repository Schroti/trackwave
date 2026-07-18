export function buildMusicbrainzArtistSearchLink(artistName: string): string {
  return `https://musicbrainz.org/search?query=${encodeURIComponent(artistName)}&type=artist&method=indexed`
}
