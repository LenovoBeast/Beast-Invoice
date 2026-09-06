import { NextResponse } from 'next/server'
import { authConfigured, checkPassphrase, COOKIE_MAX_AGE, createSessionToken, SESSION_COOKIE } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: 'Auth is not configured (set APP_PASSPHRASE and SESSION_SECRET)' }, { status: 501 })
  }
  let passphrase = ''
  try {
    const body = (await req.json()) as { passphrase?: string }
    passphrase = String(body.passphrase ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!(await checkPassphrase(passphrase))) {
    return NextResponse.json({ error: 'Wrong passphrase' }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
