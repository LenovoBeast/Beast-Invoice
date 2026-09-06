/** Passphrase gate + HMAC-signed session cookie (BEAST_BUILD_PLAN §6).
    WebCrypto only, so the same code runs in route handlers and middleware. */

export const SESSION_COOKIE = 'beast_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

const encoder = new TextEncoder()

function b64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  return atob(b64)
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return b64url(sig)
}

/** Length-independent constant-time string compare. */
function timingSafeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a)
  const bb = encoder.encode(b)
  const len = Math.max(ab.length, bb.length)
  let diff = a.length === b.length ? 0 : 1
  for (let i = 0; i < len; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

export function authConfigured(): boolean {
  return !!process.env.APP_PASSPHRASE && !!process.env.SESSION_SECRET
}

export async function checkPassphrase(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSPHRASE
  if (!expected) return false
  return timingSafeEqual(input, expected)
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  const payload = String(Date.now() + COOKIE_MAX_AGE * 1000)
  return `${payload}.${await hmac(payload, secret)}`
}

export async function verifySessionToken(token: string | null): Promise<boolean> {
  const secret = process.env.SESSION_SECRET
  if (!secret || !token) return false
  const dot = token.lastIndexOf('.')
  if (dot < 1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(payload)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  return timingSafeEqual(sig, await hmac(payload, secret))
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === SESSION_COOKIE) return rest.join('=')
  }
  return null
}

export async function isAuthed(req: Request): Promise<boolean> {
  return authConfigured() && (await verifySessionToken(readSessionCookie(req)))
}
