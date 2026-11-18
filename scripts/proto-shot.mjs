// Screenshot harness for mockups/stage-dock-prototype.html.
// Launches headless Chrome over CDP, opens every dock, and writes /tmp/p01..p08.png
// plus the runtime state and any console errors. Run: node scripts/proto-shot.mjs
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333
const FILE = new URL('../mockups/stage-dock-prototype.html', import.meta.url).href

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1600,1000',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/chrome-proto-profile',
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return await res.json()
    } catch {}
    await sleep(150)
  }
  throw new Error('chrome did not start')
}

await waitPort()

const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
const page = await res.json()
const ws = new WebSocket(page.webSocketDebuggerUrl)

let id = 0
const pending = new Map()
const logs = []

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text))
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push('CONSOLE ' + msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description).join(' '))
  }
  if (msg.method === 'Log.entryAdded') {
    logs.push('LOG ' + msg.params.entry.level + ': ' + msg.params.entry.text)
  }
}

const send = (method, params = {}) => new Promise((resolve) => {
  const msgId = ++id
  pending.set(msgId, resolve)
  ws.send(JSON.stringify({ id: msgId, method, params }))
})

await new Promise((r) => { ws.onopen = r })

await send('Runtime.enable')
await send('Log.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: FILE })
await sleep(1800)

const evaluate = async (expression) => {
  const out = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return out.result?.result?.value
}

const shot = async (name) => {
  const out = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  writeFileSync(`/tmp/${name}.png`, Buffer.from(out.result.data, 'base64'))
  console.log('shot', name)
}

const state = await evaluate(`JSON.stringify({
  dock: document.querySelector('#dock').dataset.open,
  section: document.querySelector('#dock').dataset.section,
  clock: document.querySelector('#clock').textContent,
  alt: document.querySelector('[data-k="alt"]').textContent,
  beats: document.querySelectorAll('#beatList .beat').length,
  roster: document.querySelectorAll('#roster .student').length,
  bars: document.querySelectorAll('#eicasBars rect').length,
  rect: (() => { const r = document.querySelector('#dock').getBoundingClientRect(); return [r.x, r.y, r.width, r.height] })(),
  opacity: getComputedStyle(document.querySelector('#dock')).opacity,
  transform: getComputedStyle(document.querySelector('#dock')).transform,
})`)
console.log('STATE', state)

await shot('p01-boot')

await evaluate(`document.querySelector('.rail-btn[data-dock="lesson"]').click()`)
await sleep(900)
await shot('p02-lesson')

await evaluate(`document.querySelector('.rail-btn[data-dock="data"]').click()`)
await sleep(900)
await shot('p03-data')

await evaluate(`document.querySelector('.rail-btn[data-dock="class"]').click()`)
await sleep(900)
await shot('p04-class')

await evaluate(`document.querySelector('.rail-btn[data-dock="systems"]').click()`)
await sleep(600)
await shot('p05-systems')

await evaluate(`document.querySelector('#stageOnlyBtn').click()`)
await sleep(700)
await shot('p06-stageonly')

await evaluate(`document.querySelector('#stageOnlyPill').click()`)
await sleep(400)
await evaluate(`document.querySelector('#paletteBtn').click()`)
await sleep(500)
await shot('p07-palette')

await evaluate(`document.querySelector('#paletteInput').value = 'thrust'; document.querySelector('#paletteInput').dispatchEvent(new Event('input'))`)
await sleep(300)
await shot('p08-palette-thrust')

await evaluate(`document.querySelector('#paletteBackdrop').click()`)
await sleep(300)
await evaluate(`document.querySelector('[data-dock="systems"]').click()`)
await sleep(500)
await evaluate(`document.querySelector('[data-dock="systems"]').click()`)
await sleep(500)
const final = await evaluate(`JSON.stringify({ dock: document.querySelector('#dock').dataset.open })`)
console.log('FINAL', final)

console.log('LOGS')
for (const l of logs) console.log(l)

ws.close()
chrome.kill()
