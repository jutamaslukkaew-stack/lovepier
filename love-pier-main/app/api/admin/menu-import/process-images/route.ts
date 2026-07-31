import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processRawImage, type ProcessResult } from '@/lib/menuImport/imageProcess'

// Convert one batch of already-uploaded raw images. The CLIENT drives the queue
// (5-10 files per call) so no single serverless invocation risks a timeout. Body:
//   { items: [{ importCode: string, ext: string }] }
const MAX_BATCH = 12

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let items: { importCode: string; ext: string }[]
  try {
    const body = await req.json()
    items = Array.isArray(body?.items) ? body.items : []
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 })
  }
  if (!items.length) return NextResponse.json({ error: 'ไม่มีรายการรูป' }, { status: 400 })
  if (items.length > MAX_BATCH) {
    return NextResponse.json({ error: `ก้อนละไม่เกิน ${MAX_BATCH} ไฟล์` }, { status: 400 })
  }

  // Sequential within the batch to keep peak memory bounded (sharp on 1440px).
  const results: ProcessResult[] = []
  for (const it of items) {
    if (!it?.importCode || !it?.ext) {
      results.push({ importCode: String(it?.importCode ?? '?'), ok: false, error: 'ข้อมูลไม่ครบ' })
      continue
    }
    results.push(await processRawImage(String(it.importCode), String(it.ext)))
  }

  return NextResponse.json({
    ok: true,
    processed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
