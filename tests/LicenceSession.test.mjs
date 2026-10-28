import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ensureFreshSession,
  licenceBaseUrl,
  licenceLabel,
  licenceNeedsAttention,
  licenceResolved,
  probeLicence,
} from '../src/Pocketbase/licence.ts'

function fixture({ token = '', isValid = true, refresh } = {}) {
  const calls = { refresh: 0, clear: 0 }
  const client = {
    authStore: {
      token,
      isValid,
      clear() {
        calls.clear++
        client.authStore.token = ''
        client.authStore.isValid = false
      },
    },
    collection(name) {
      assert.equal(name, 'users')
      return {
        async authRefresh() {
          calls.refresh++
          return refresh ? refresh() : {}
        },
      }
    },
  }
  return { client, calls }
}

const rejection = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

test('a server-rejected session is cleared so the licence check stops using it', async () => {
  const { client, calls } = fixture({
    token: 'stale',
    refresh: () => {
      throw rejection(401)
    },
  })

  assert.equal(await ensureFreshSession(client), 'expired')
  assert.equal(calls.clear, 1)
})

test('a transport failure keeps the stored session', async () => {
  const { client, calls } = fixture({
    token: 'token',
    refresh: () => {
      throw new TypeError('Failed to fetch')
    },
  })

  assert.equal(await ensureFreshSession(client), 'valid')
  assert.equal(calls.clear, 0)
})

test('a refreshed session stays usable', async () => {
  const { client, calls } = fixture({ token: 'token' })

  assert.equal(await ensureFreshSession(client), 'valid')
  assert.equal(calls.refresh, 1)
  assert.equal(calls.clear, 0)
})

test('no stored token means signed out and no request', async () => {
  const { client, calls } = fixture({ token: '' })

  assert.equal(await ensureFreshSession(client), 'signed-out')
  assert.equal(calls.refresh, 0)
})

test('a locally expired token is cleared without a request', async () => {
  const { client, calls } = fixture({ token: 'token', isValid: false })

  assert.equal(await ensureFreshSession(client), 'expired')
  assert.equal(calls.refresh, 0)
  assert.equal(calls.clear, 1)
})

test('licence labels separate trial mode from a failed check', () => {
  assert.equal(licenceLabel('valid'), 'Valid')
  assert.equal(licenceLabel('trial'), 'Trial mode')
  assert.equal(licenceLabel('signed-out'), 'Sign in to check')
  assert.equal(licenceLabel('session-expired'), 'Session expired')
  assert.equal(licenceLabel('unreachable'), 'Check failed')
  assert.equal(licenceNeedsAttention('session-expired'), true)
  assert.equal(licenceNeedsAttention('unreachable'), true)
  assert.equal(licenceNeedsAttention('trial'), false)
  assert.equal(licenceResolved('checking'), false)
  assert.equal(licenceResolved('unknown'), false)
  assert.equal(licenceResolved('trial'), true)
})

const payload = (value) =>
  Buffer.from(JSON.stringify({ valid: value, active: value })).toString('base64')

const answer = (status, body) => async () => ({
  status,
  ok: status >= 200 && status < 300,
  async text() {
    return JSON.stringify(body)
  },
})

test('the endpoint answer distinguishes "no licence" from a failed check', async () => {
  assert.equal(
    await probeLicence(
      'http://localhost:3000/pb',
      'token',
      answer(200, { payload: payload(true) }),
    ),
    'valid',
  )
  assert.equal(
    await probeLicence(
      'http://localhost:3000/pb',
      'token',
      answer(200, { payload: payload(false) }),
    ),
    'trial',
  )
  assert.equal(await probeLicence('http://localhost:3000/pb', 'token', answer(401, {})), 'expired')
  assert.equal(
    await probeLicence('http://localhost:3000/pb', 'token', answer(500, {})),
    'unreachable',
  )
  assert.equal(
    await probeLicence('http://localhost:3000/pb', 'token', async () => {
      throw new TypeError('Failed to fetch')
    }),
    'unreachable',
  )
})

test('a web page on the licence URL is reported as the wrong server, not as no licence', async () => {
  // Open WebUI (and any SPA server) answers 200 with its own HTML for every
  // path, including /pb/licence/. Treating that as "no licence" is what made a
  // valid licence look like Trial mode.
  const html = async () => ({
    status: 200,
    ok: true,
    async text() {
      return '<!doctype html>\n<html lang="en"><head><title>Open WebUI</title></head></html>'
    },
  })

  assert.equal(await probeLicence('http://localhost:3000/pb', 'token', html), 'wrong-server')
})

test('the probe never reads a cached copy of the licence response', async () => {
  // A service that answers every path with its own page makes the licence URL
  // heuristically cacheable, and Chrome then replays that page for days.
  let options
  const request = async (_url, init) => {
    options = init
    return { status: 200, ok: true, text: async () => JSON.stringify({ payload: payload(true) }) }
  }

  await probeLicence('http://localhost:3000/pb', 'token', request)
  assert.equal(options.cache, 'no-store')
})

test('the probe normalises a trailing slash and never sends an empty token', async () => {
  const urls = []
  const request = async (url) => {
    urls.push(url)
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ payload: payload(true) }),
    }
  }

  assert.equal(await probeLicence('http://localhost:3000/pb/', 'token', request), 'valid')
  assert.deepEqual(urls, ['http://localhost:3000/pb/licence/'])
  assert.equal(await probeLicence('http://localhost:3000/pb', '', request), 'unreachable')
  assert.deepEqual(urls, ['http://localhost:3000/pb/licence/'])
})

test('the client only gets a base URL it was built with', () => {
  assert.equal(licenceBaseUrl('http://localhost:3000/pb'), 'http://localhost:3000/pb')
  assert.equal(licenceBaseUrl('http://localhost:3000/pb/'), 'http://localhost:3000/pb')
  assert.equal(licenceBaseUrl(' http://localhost:3000/pb// '), 'http://localhost:3000/pb')
  assert.equal(
    licenceBaseUrl('https://raspberrypi.tail89a8a0.ts.net/pb/'),
    'https://raspberrypi.tail89a8a0.ts.net/pb',
  )
  // The dev server answers on both spellings, the client was only built with one.
  assert.equal(licenceBaseUrl('http://127.0.0.1:3000/pb'), 'http://localhost:3000/pb')
  // Anything else would be refused by the client without a request.
  assert.equal(licenceBaseUrl('http://localhost:8090'), null)
  assert.equal(licenceBaseUrl('https://example.com/pb'), null)
  assert.equal(licenceBaseUrl(''), null)
})
