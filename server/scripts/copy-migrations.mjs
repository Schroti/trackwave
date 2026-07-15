import { cpSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const from = path.resolve(__dirname, '..', 'src', 'db', 'migrations')
const to = path.resolve(__dirname, '..', 'dist', 'db', 'migrations')

cpSync(from, to, { recursive: true })
