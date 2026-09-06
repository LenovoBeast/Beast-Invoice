import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { markInvoicePaid } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isServerMode()) return NextResponse.json({ error: 'Local mode' }, { status: 400 })
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    const invoice = await markInvoicePaid(id)
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    return NextResponse.json({ ok: true, invoice })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
