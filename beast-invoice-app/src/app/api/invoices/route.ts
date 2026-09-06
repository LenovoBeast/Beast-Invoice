import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/server/auth'
import { isServerMode } from '@/lib/server/db'
import { createInvoice, type NewInvoiceInput } from '@/lib/server/repo'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isServerMode()) return NextResponse.json({ error: 'Local mode' }, { status: 400 })
  if (!(await isAuthed(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const input = (await req.json()) as NewInvoiceInput
    if (input.status !== 'Draft' && input.status !== 'Sent') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const invoice = await createInvoice(input)
    return NextResponse.json({ ok: true, invoice })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 500 })
  }
}
