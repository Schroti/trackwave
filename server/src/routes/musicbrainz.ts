import { Router } from 'express'
import { checkMusicbrainzStatus, type MusicbrainzEntity } from '../musicbrainz/client.js'

const router = Router()

function getRequestedEntity(value: unknown): MusicbrainzEntity | null {
  if (value === 'release' || value === 'artist') {
    return value
  }

  return null
}

router.get('/status', async (req, res) => {
  try {
    const url = String(req.query.url ?? '')
    const entity = getRequestedEntity(req.query.entity)

    if (!url || !entity) {
      res.status(400).json({ message: 'Missing or invalid url/entity parameter.' })
      return
    }

    const status = await checkMusicbrainzStatus(url, entity)
    res.json(status)
  } catch (error) {
    res.status(502).json({
      message: error instanceof Error ? error.message : 'Failed to check MusicBrainz status.',
    })
  }
})

export default router
