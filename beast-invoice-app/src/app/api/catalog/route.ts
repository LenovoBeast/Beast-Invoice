import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { createPart, createService } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isServerMode()) return NextResponse.json({ error: 'Local mode' }, { status: 400 })
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = (await req.json()) as { kind?: string; data?: Record<string, unknown> }
    if (body.kind === 'service') {
      const name = String(body.data?.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      const service = await createService({
        name,
        cat: body.data?.cat ? String(body.data.cat) : 'General',
        mode: body.data?.mode === 'hours' ? 'hours' : 'flat',
        price: body.data?.price === undefined ? undefined : Number(body.data.price),
        hours: body.data?.hours === undefined ? undefined : Number(body.data.hours),
      })
      return NextResponse.json({ ok: true, service })
    }
    if (body.kind === 'part') {
      const name = String(body.data?.name ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      const part = await createPart({
        name,
        pn: body.data?.pn ? String(body.data.pn) : '',
        brand: body.data?.brand ? String(body.data.brand) : '',
        price: body.data?.price === undefined ? 0 : Number(body.data.price),
        stock: body.data?.stock === undefined ? 0 : Number(body.data.stock),
      })
      return NextResponse.json({ ok: true, part })
    }
    return NextResponse.json({ error: 'Unknown catalog kind' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 500 })
  }
}
