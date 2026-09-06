import { createClient, type Client } from '@libsql/client'

let _client: Client | null = null

/** Server mode is active only when a database URL exists; otherwise the app
    runs entirely in the browser (localStorage), which keeps local previews
    and CI working without credentials. */
export function isServerMode(): boolean {
  return !!process.env.TURSO_DATABASE_URL
}

export function db(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL
    if (!url) throw new Error('TURSO_DATABASE_URL is not set')
    _client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  }
  return _client
}
