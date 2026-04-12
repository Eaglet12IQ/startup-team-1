import express from 'express'
import { buildImage } from './imageBuilder.js'
import { rmSync } from 'fs'
import { dirname } from 'path'

const app = express()
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})
app.use(express.json({ limit: '50mb' }))

// POST /build-image — собирает образ с вшитым дизайном и отдаёт на скачивание
// Body: { blocks: [...] }
app.post('/build-image', async (req, res) => {
  const blocks = req.body?.blocks || []
  console.log(`Build requested, blocks: ${blocks.length}`)

  let imgPath = null
  try {
    imgPath = await buildImage(blocks)

    res.download(imgPath, 'pidisplay.img', (err) => {
      if (err) console.error('Download error:', err)
      if (imgPath) {
        try { rmSync(dirname(imgPath), { recursive: true }) } catch {}
      }
    })

  } catch (err) {
    console.error('Build failed:', err)
    res.status(500).json({ error: err.message })
  }
})

// Healthcheck
app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(3000, () => console.log('pi-image-builder listening on :3000'))