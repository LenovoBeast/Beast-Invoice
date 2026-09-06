import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { getSnapshot } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

/** Single bootstrap endpoint: tells the client which mode it is in and, when
    authed, returns the full snapshot (one user, one shop, few hundred rows). */
export async function GET(req: Request) {
  if (!isServerMode()) {
    return NextResponse.json({ mode: 'local' }, { headers: { 'cache-control': 'no-store' } })
  }
  if (!(await isAuthed(req))) {
    return NextResponse.json({ mode: 'server', authed: false }, { headers: { 'cache-control': 'no-store' } })
  }
  try {
    const data = await getSnapshot()
    return NextResponse.json({ mode: 'server', authed: true, data }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { mode: 'server', authed: true, error: 'Database not reachable. Did you apply db/schema.sql? See DEPLOY.md.' },
      { status: 500, headers: { 'cache-control': 'no-store' } },
    )
  }
}
