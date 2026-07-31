import { NextResponse } from 'next/server'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { menuItems } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { classifyImages, extOf, type ValidCode } from '@/lib/menuImport/imageMatch'
import { BUCKET, rawPath, serviceSupabase } from '@/lib/menuImport/imageProcess'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Body: { filenames: string[] }  (names/relative paths only — NO file bytes)
// Returns a match report plus a signed direct-upload URL per matched file so the
// browser uploads originals straight to Supabase (bypassing the Vercel body limit).
export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let filenames: string[]
  try {
    const body = await req.json()
    filenames = Array.isArray(body?.filenames) ? body.filenames.map(String) : []
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 })
  }
  if (!filenames.length) return NextResponse.json({ error: 'ไม่มีรายชื่อไฟล์' }, { status: 400 })

  const rows = await db
    .select({ importCode: menuItems.importCode, imageFile: menuItems.imageFile })
    .from(menuItems)
    .where(and(isNotNull(menuItems.importCode), eq(menuItems.isDeleted, false)))
  const validCodes: ValidCode[] = rows.map((r) => ({ importCode: r.importCode as string, imageFile: r.imageFile }))

  const report = classifyImages(filenames, validCodes)

  const sb = serviceSupabase()
  const uploads: { path: string; importCode: string; ext: string; rawPath: string; token: string }[] = []
  for (const m of report.matched) {
    const ext = extOf(m.path)
    const dest = rawPath(m.importCode, ext)
    const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(dest, { upsert: true })
    if (error || !data) continue // fall through: file just won't be in the upload list
    uploads.push({ path: m.path, importCode: m.importCode, ext, rawPath: dest, token: data.token })
  }

  return NextResponse.json({ ok: true, bucket: BUCKET, report, uploads })
}
