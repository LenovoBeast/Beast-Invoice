import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { updateSettings } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isServerMode()) return NextResponse.json({ error: 'Local mode' }, { status: 400 })
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = (await req.json()) as Record<string, unknown>
    const settings = await updateSettings(patch)
    return NextResponse.json({ ok: true, settings })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
