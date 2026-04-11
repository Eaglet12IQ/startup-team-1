import express from 'express'
import multer from 'multer'
import { buildImage } from './imageBuilder.js'
import { existsSync } from 'fs'

const app = express()
const upload = multer()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// POST /build-image
// Body: { html: "<html>...</html>" }
// или form-data с полем html
app.post('/build-image', upload.none(), async (req, res) => {
  const html = req.body.html

  if (!html || !html.trim()) {
    return res.status(400).json({ error: 'html field is required' })
  }

  console.log('Build requested, html length:', html.length)

  let imgPath = null
  try {
    imgPath = await buildImage(html)

    // Отдаём файл на скачивание
    res.download(imgPath, 'fullpageos-custom.img', (err) => {
      if (err) console.error('Download error:', err)
      // Удаляем временный файл после отдачи
      if (imgPath) {
        try { require('fs').rmSync(require('path').dirname(imgPath), { recursive: true }) } catch {}
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