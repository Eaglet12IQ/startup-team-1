import { execSync } from 'child_process'
import { mkdirSync, copyFileSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const BASE_IMAGE = '/app/images/fullpageos.img'
const WORK_DIR = '/tmp/pi-builds'

const BOOT_OFFSET = 8192 * 512        // 4194304
const ROOT_OFFSET = 1056768 * 512     // 541065216

export async function buildImage(htmlContent) {
  const buildId = uuidv4()
  const buildDir = join(WORK_DIR, buildId)
  const imgPath = join(buildDir, 'output.img')
  const bootMount = join(buildDir, 'boot')
  const rootMount = join(buildDir, 'root')

  mkdirSync(buildDir, { recursive: true })
  mkdirSync(bootMount, { recursive: true })
  mkdirSync(rootMount, { recursive: true })

  try {
    console.log(`[${buildId}] Copying base image...`)
    copyFileSync(BASE_IMAGE, imgPath)

    // Монтируем boot раздел — меняем fullpageos.txt
    execSync(`mount -o loop,offset=${BOOT_OFFSET} ${imgPath} ${bootMount}`)
    writeFileSync(join(bootMount, 'fullpageos.txt'), 'http://localhost/kiosk.html\n', 'utf8')
    execSync(`umount ${bootMount}`)
    console.log(`[${buildId}] Boot partition updated`)

    // Монтируем root раздел — кладём HTML в /var/www/html/
    execSync(`mount -o loop,offset=${ROOT_OFFSET} ${imgPath} ${rootMount}`)
    const wwwDir = join(rootMount, 'var/www/html')
    mkdirSync(wwwDir, { recursive: true })
    writeFileSync(join(wwwDir, 'kiosk.html'), htmlContent, 'utf8')
    execSync(`umount ${rootMount}`)
    console.log(`[${buildId}] HTML written to /var/www/html/kiosk.html`)

    return imgPath

  } catch (err) {
    try { execSync(`umount ${bootMount} 2>/dev/null || true`) } catch {}
    try { execSync(`umount ${rootMount} 2>/dev/null || true`) } catch {}
    throw err
  }
}