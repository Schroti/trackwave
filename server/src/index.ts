import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import spotifyRoutes from './routes/spotify.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const isProduction = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', spotifyRoutes)

if (isProduction) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const frontendDistPath = path.resolve(__dirname, '../../frontend/dist')

  app.use(express.static(frontendDistPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'))
  })
}

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Trackwave server listening on port ${port}`)
})
