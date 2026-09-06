import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { createClient } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isServerMode()) return NextResponse.json({ error: 'Local mode' }, { status: 400 })
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const input = (await req.json()) as Parameters<typeof createClient>[0]
    if (!input?.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const created = await createClient(input)
    return NextResponse.json({ ok: true, ...created })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 500 })
  }
}
