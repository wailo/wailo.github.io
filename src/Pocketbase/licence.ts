import type PocketBase from 'pocketbase'

/**
 * Outcome of the licence check that gates the simulator.
 *
 * The wasm client only reports a boolean, so the app adds the states it can
 * distinguish itself (no session, rejected session, request never sent) to
 * explain a "Trial" badge instead of showing it silently.
 */
export type LicenceState =
  | 'unknown' // nothing checked yet
  | 'checking' // a licence request is in flight
  | 'valid' // server confirmed an active licence
  | 'trial' // server answered, no active licence for this account
  | 'signed-out' // no session at all, the simulator runs in trial mode
  | 'session-expired' // the stored session was rejected by the server
  | 'unreachable' // the licence request could not be issued or never answered

/** Result of validating the stored session before using it. */
export type SessionState = 'valid' | 'signed-out' | 'expired'

type LicenceClient = Pick<PocketBase, 'authStore' | 'collection'>

// Statuses that mean "this token is no longer accepted", as opposed to a
// transport failure that says nothing about the session.
const AUTH_REJECTION_STATUSES = new Set([401, 403, 404])

const isAuthRejection = (error: unknown): boolean => {
  const status = (error as { status?: unknown } | null)?.status
  return typeof status === 'number' && AUTH_REJECTION_STATUSES.has(status)
}

/**
 * Validate the stored session against the server before it is used.
 *
 * `authStore.isValid` only checks the token's local `exp` claim, so a token can
 * look fine while the server rejects it (rotated signing key, refreshed
 * `tokenKey`, deleted account). In that state every licence check fails and the
 * app silently stays on "Trial" for days, because nothing ever re-validates the
 * session. Refreshing here both keeps the short-lived token alive and detects a
 * dead session while the user can still act on it.
 */
export async function ensureFreshSession(client: LicenceClient): Promise<SessionState> {
  if (!client.authStore.token) return 'signed-out'
  if (!client.authStore.isValid) {
    client.authStore.clear()
    return 'expired'
  }

  try {
    await client.collection('users').authRefresh()
    return 'valid'
  } catch (error) {
    // A transport failure must not sign the user out; only a server rejection
    // means the stored token can no longer authenticate.
    if (isAuthRejection(error)) {
      client.authStore.clear()
      return 'expired'
    }
    return client.authStore.isValid ? 'valid' : 'expired'
  }
}

// The simulator client compares the base URL it is given against these exact
// strings. Anything else (a trailing slash, another host spelling) makes it
// refuse the check without a request, which looks exactly like "no licence".
const LICENCE_BASE_URLS = ['https://raspberrypi.tail89a8a0.ts.net/pb', 'http://localhost:3000/pb']

// The dev API answers on both spellings, but the client was only built with one.
const LICENCE_BASE_URL_ALIASES: Record<string, string> = {
  'http://127.0.0.1:3000/pb': 'http://localhost:3000/pb',
}

/**
 * Return the spelling of `url` the simulator client accepts, or `null`.
 *
 * Passing the client a URL it does not know silently disables the licence check,
 * so the app normalises it and reports the mismatch instead of retrying forever.
 */
export function licenceBaseUrl(url: string): string | null {
  const trimmed = url.trim().replace(/\/+$/, '')
  const canonical = LICENCE_BASE_URL_ALIASES[trimmed] ?? trimmed
  return LICENCE_BASE_URLS.includes(canonical) ? canonical : null
}

/**
 * What the licence endpoint itself answered, used to explain a "no licence" push
 * from C++.
 *
 * `wrong-server` is not a licence answer at all: something else (a web app that
 * serves its own page for every path, such as Open WebUI) is listening on the
 * port, so the request never reached PocketBase.
 */
export type LicenceAnswer = 'valid' | 'trial' | 'expired' | 'unreachable' | 'wrong-server'

/**
 * Ask the licence endpoint directly.
 *
 * The wasm client reports a single boolean, so "the server says this account has
 * no licence" and "the client could not complete the check" look identical. This
 * request tells them apart and names the reason in the UI.
 */
export async function probeLicence(
  url: string,
  token: string,
  request: typeof fetch = fetch,
): Promise<LicenceAnswer> {
  if (!token) return 'unreachable'
  try {
    const response = await request(`${url.replace(/\/+$/, '')}/licence/`, {
      headers: { Authorization: token },
      // A browser can still hold a cached copy of this URL from when another
      // service owned the port: a 200 HTML page with Last-Modified and no
      // Cache-Control is heuristically cacheable for days, and Chrome then
      // replays it without asking the server. The probe must describe what the
      // server says now, so it never reads the cache.
      cache: 'no-store',
    })
    if (response.status === 401 || response.status === 403) return 'expired'
    if (!response.ok) return 'unreachable'
    const text = await response.text()
    // PocketBase only ever answers with JSON. A page here means another service
    // holds the port and replied to every path with its own app shell, which is
    // how a licence check turns into a silent "Trial" badge.
    let body: { payload?: unknown }
    try {
      body = JSON.parse(text) as { payload?: unknown }
    } catch {
      return text.trimStart().startsWith('<') ? 'wrong-server' : 'unreachable'
    }
    if (typeof body.payload !== 'string') return 'unreachable'
    const payload = JSON.parse(atob(body.payload)) as { valid?: unknown }
    return payload?.valid === true ? 'valid' : 'trial'
  } catch {
    return 'unreachable'
  }
}

export const licenceLabel = (state: LicenceState): string =>
  ({
    unknown: 'Checking…',
    checking: 'Checking…',
    valid: 'Valid',
    trial: 'Trial mode',
    'signed-out': 'Sign in to check',
    'session-expired': 'Session expired',
    unreachable: 'Check failed',
  })[state]

/** True when the licence line should be highlighted as a problem. */
export const licenceNeedsAttention = (state: LicenceState): boolean =>
  state === 'session-expired' || state === 'unreachable'

/** True once an answer (from the session check or from C++) is available. */
export const licenceResolved = (state: LicenceState): boolean =>
  state !== 'unknown' && state !== 'checking'
