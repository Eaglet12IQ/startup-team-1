import { execSync } from 'child_process'
import { mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_IMAGE = '/app/images/fullpageos.img'
const WORK_DIR = '/tmp/pi-builds'
const CONFIGS_DIR = join(__dirname, 'configs')

// Оффсеты разделов FullPageOS
const BOOT_OFFSET = 8192 * 512        // раздел boot (FAT32)
const ROOT_OFFSET = 1056768 * 512     // раздел root (ext4)

// Docker-образы собираются для ARM/v7 (Raspbian 32-bit userspace)
const BACKEND_IMAGE = 'pidisplay-backend:latest'
const FRONTEND_IMAGE = 'pidisplay-frontend:latest'

function exec(cmd, opts = {}) {
  console.log(`  $ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function readConfig(name) {
  return readFileSync(join(CONFIGS_DIR, name), 'utf8')
}

function renderBlocksToHtml(blocks) {
  const elements = blocks.map((block, i) => {
    const z = 10 + i
    const { x = 50, y = 50, width: w = 20, height: h = 10 } = block
    const base = `position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;transform:translate(-50%,-50%);z-index:${z};overflow:hidden;`

    if (block.type === 'text') {
      const { content = '', fontSize = 50, fontWeight = 'normal', color = '#000', textAlign = 'left', verticalAlign = 'center' } = block
      const justify = { left: 'flex-start', right: 'flex-end', center: 'center' }[textAlign] || 'flex-start'
      const align = { top: 'flex-start', bottom: 'flex-end', center: 'center' }[verticalAlign] || 'center'
      const fs = `calc(${h}vh * ${fontSize} / 100)`
      const inner = `width:100%;height:100%;overflow:hidden;font-size:${fs};font-weight:${fontWeight};color:${color};text-align:${textAlign};display:flex;align-items:${align};justify-content:${justify};`
      const escaped = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
      return `<div style="${base}"><div style="${inner}"><span style="white-space:pre-wrap;word-break:break-word;">${escaped}</span></div></div>`
    }

    if (block.type === 'image') {
      const src = (block.src || '').replace(/"/g, '&quot;')
      const objectFit = block.objectFit || 'cover'
      return `<div style="${base}"><img src="${src}" alt="" style="width:100%;height:100%;object-fit:${objectFit};display:block;" /></div>`
    }

    return ''
  }).join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: #fff; position: relative; }
</style>
</head>
<body>
${elements}
</body>
</html>`
}

export async function buildImage(blocks = []) {
  const buildId = uuidv4()
  const buildDir = join(WORK_DIR, buildId)
  const imgPath = join(buildDir, 'output.img')
  const bootMount = join(buildDir, 'boot')
  const rootMount = join(buildDir, 'root')
  const tarDir = join(buildDir, 'docker-images')

  mkdirSync(buildDir, { recursive: true })
  mkdirSync(bootMount, { recursive: true })
  mkdirSync(rootMount, { recursive: true })
  mkdirSync(tarDir, { recursive: true })

  try {
    // ── 1. Сборка Docker-образов для ARM64 ────────────────────────────────
    console.log(`[${buildId}] Building ARM64 Docker images...`)

    exec(
      `docker buildx build --platform linux/arm/v7 ` +
      `--load -t ${BACKEND_IMAGE} ` +
      `-f /app/source/backend/constructor-service/Dockerfile ` +
      `/app/source/backend/constructor-service`
    )

    exec(
      `docker buildx build --platform linux/arm/v7 ` +
      `--load -t ${FRONTEND_IMAGE} ` +
      `--build-arg VITE_PI_MODE=true ` +
      `-f /app/source/frontend/Dockerfile ` +
      `/app/source`
    )

    // ── 2. Экспорт образов в tar ───────────────────────────────────────────
    console.log(`[${buildId}] Exporting Docker images to tar...`)
    exec(`docker save ${BACKEND_IMAGE} -o ${join(tarDir, 'backend.tar')}`)
    exec(`docker save ${FRONTEND_IMAGE} -o ${join(tarDir, 'frontend.tar')}`)

    // ── 3. Копируем базовый образ ──────────────────────────────────────────
    console.log(`[${buildId}] Copying base image...`)
    copyFileSync(BASE_IMAGE, imgPath)

    // Расширяем образ на 2GB для Docker-образов (~800MB каждый)
    exec(`truncate -s +2G ${imgPath}`)

    // ── 4. Boot раздел — меняем URL на localhost ───────────────────────────
    console.log(`[${buildId}] Updating boot partition...`)
    exec(`mount -o loop,offset=${BOOT_OFFSET} ${imgPath} ${bootMount}`)
    // FullPageOS читает URL из fullpageos.txt — Pi открывает наш фронтенд
    // Pi открывает дисплей (результат), редактор доступен с телефона на http://192.168.4.1/
    writeFileSync(join(bootMount, 'fullpageos.txt'), 'http://192.168.4.1:8082/api/display/\n', 'utf8')
    writeFileSync(join(bootMount, 'check_for_httpd'), 'disabled\n', 'utf8')
    exec(`umount ${bootMount}`)

    // ── 5. Root раздел — вшиваем всё ──────────────────────────────────────
    console.log(`[${buildId}] Mounting root partition...`)

    // Создаём loop-устройство для root раздела и расширяем fs
    const loopDev = execSync(`losetup -f --show -o ${ROOT_OFFSET} ${imgPath}`).toString().trim()
    exec(`e2fsck -f -y ${loopDev} || true`)
    exec(`resize2fs ${loopDev}`)
    exec(`losetup -d ${loopDev}`)

    exec(`mount -o loop,offset=${ROOT_OFFSET} ${imgPath} ${rootMount}`)

    // 5a. Устанавливаем пакеты через chroot (docker, hostapd, dnsmasq)
    console.log(`[${buildId}] Installing packages in chroot...`)
    exec(`mount --bind /proc ${rootMount}/proc`)
    exec(`mount --bind /sys ${rootMount}/sys`)
    exec(`mount --bind /dev ${rootMount}/dev`)

    exec(
      `chroot ${rootMount} /bin/bash -c "` +
      `apt-get update -qq && ` +
      `apt-get install -y --no-install-recommends docker.io hostapd dnsmasq && ` +
      `apt-get clean && rm -rf /var/lib/apt/lists/*` +
      `"`
    )

    // Скачиваем docker-compose для ARM64 и кладём в образ
    console.log(`[${buildId}] Downloading docker-compose for ARM64...`)
    exec(
      `curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-aarch64" ` +
      `-o ${join(rootMount, 'usr/local/bin/docker-compose')}`
    )
    exec(`chmod +x ${join(rootMount, 'usr/local/bin/docker-compose')}`)

    // 5b. Конфиги hotspot
    console.log(`[${buildId}] Writing hotspot configs...`)
    const etcDir = join(rootMount, 'etc')

    writeFileSync(join(etcDir, 'hostapd', 'hostapd.conf'), readConfig('hostapd.conf'))
    writeFileSync(
      join(etcDir, 'default', 'hostapd'),
      'DAEMON_CONF="/etc/hostapd/hostapd.conf"\n'
    )
    writeFileSync(join(etcDir, 'dnsmasq.conf'), readConfig('dnsmasq.conf'))

    // dhcpcd — статический IP на wlan0
    const dhcpcdPath = join(etcDir, 'dhcpcd.conf')
    const dhcpcdAppend = readConfig('dhcpcd.conf')
    const existing = existsSync(dhcpcdPath) ? readFileSync(dhcpcdPath, 'utf8') : ''
    writeFileSync(dhcpcdPath, existing + '\n' + dhcpcdAppend)

    // NetworkManager — не трогать wlan0 (иначе конфликт с hostapd)
    const nmConfDir = join(etcDir, 'NetworkManager', 'conf.d')
    mkdirSync(nmConfDir, { recursive: true })
    writeFileSync(join(nmConfDir, 'hotspot.conf'),
      '[keyfile]\nunmanaged-devices=interface-name:wlan0\n'
    )

    // Включаем сервисы, отключаем wpa_supplicant на wlan0
    exec(`chroot ${rootMount} systemctl enable hostapd dnsmasq`)
    exec(`chroot ${rootMount} systemctl disable wpa_supplicant || true`)

    // 5c. Начальный дизайн дисплея
    console.log(`[${buildId}] Writing initial display HTML...`)
    const displayDir = join(rootMount, 'opt', 'pidisplay')
    mkdirSync(displayDir, { recursive: true })
    const initialHtml = blocks.length > 0
      ? renderBlocksToHtml(blocks)
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh;}<\/style></head><body><p style="color:#444;font-family:sans-serif;font-size:24px">Ожидание контента...</p></body></html>`
    writeFileSync(join(displayDir, 'display.html'), initialHtml, 'utf8')

    // 5d. Docker-образы
    console.log(`[${buildId}] Copying Docker images...`)
    const piDockerDir = join(rootMount, 'opt', 'pidisplay', 'images')
    mkdirSync(piDockerDir, { recursive: true })
    exec(`cp ${join(tarDir, 'backend.tar')} ${piDockerDir}/backend.tar`)
    exec(`cp ${join(tarDir, 'frontend.tar')} ${piDockerDir}/frontend.tar`)

    // docker-compose для Pi
    writeFileSync(
      join(rootMount, 'opt', 'pidisplay', 'docker-compose.yml'),
      readConfig('docker-compose.pi.yml')
    )

    // 5d. Скрипт первого запуска — загружает образы и поднимает стек
    const firstRunScript = `#!/bin/bash
set -e

DOCKER=/usr/bin/docker
COMPOSE=/usr/local/bin/docker-compose

# Загружаем Docker образы из tar (один раз при первом старте)
if [ ! -f /opt/pidisplay/.images-loaded ]; then
  $DOCKER load -i /opt/pidisplay/images/backend.tar
  $DOCKER load -i /opt/pidisplay/images/frontend.tar
  touch /opt/pidisplay/.images-loaded
fi

cd /opt/pidisplay
$COMPOSE up -d --pull never
`
    writeFileSync(join(rootMount, 'opt', 'pidisplay', 'start.sh'), firstRunScript)
    exec(`chmod +x ${join(rootMount, 'opt', 'pidisplay', 'start.sh')}`)

    // 5e. systemd сервис
    console.log(`[${buildId}] Installing systemd service...`)
    writeFileSync(
      join(rootMount, 'etc', 'systemd', 'system', 'pidisplay.service'),
      readConfig('pidisplay.service')
    )
    exec(`chroot ${rootMount} systemctl enable pidisplay`)

    // Размонтируем всё
    exec(`umount ${rootMount}/proc`)
    exec(`umount ${rootMount}/sys`)
    exec(`umount ${rootMount}/dev`)
    exec(`umount ${rootMount}`)

    console.log(`[${buildId}] Done! Image ready at ${imgPath}`)
    return imgPath

  } catch (err) {
    // Чистим маунты при ошибке
    for (const mp of [
      `${rootMount}/proc`, `${rootMount}/sys`, `${rootMount}/dev`,
      bootMount, rootMount
    ]) {
      try { execSync(`umount ${mp} 2>/dev/null || true`) } catch {}
    }
    throw err
  }
}
