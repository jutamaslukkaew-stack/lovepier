import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// No image processing here on purpose. sharp is a native addon and on this
// monorepo + Vercel setup the function kept shipping a sharp copy without its
// libvips .so (ERR_DLOPEN_FAILED), 500-ing every upload. The client
// (lib/upload-image.ts) now resizes to the 480/960/1440 webp variants with
// browser-image-compression and posts them here; this route only does the
// privileged Supabase upload with the service key. A slow round-trip still
// gets headroom.
export const maxDuration = 30

const BUCKET = 'uploads'
const VARIANT_WIDTHS = [480, 960, 1440]
const MAX_VARIANT_MB = 4
const MAX_VIDEO_MB = 100

function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function putObject(path: string, blob: Blob, contentType: string) {
  const supabase = serviceSupabase()
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const form = await req.formData()

    // ── video: uploaded as-is ────────────────────────────────────────────
    const single = form.get('file')
    if (single instanceof File && single.type.startsWith('video/')) {
      if (single.size > MAX_VIDEO_MB * 1024 * 1024) {
        return NextResponse.json({ error: `วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB` }, { status: 400 })
      }
      const ext = single.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
      const url = await putObject(`video/${crypto.randomUUID()}.${ext}`, single, single.type)
      return NextResponse.json({ url, type: 'video' })
    }

    // ── images: the client sends pre-resized webp variants ───────────────
    const base = `img/${crypto.randomUUID()}`
    const sized: { width: number; url: string }[] = []
    for (const w of VARIANT_WIDTHS) {
      const part = form.get(`variant-${w}`)
      if (!(part instanceof File)) continue
      if (part.size > MAX_VARIANT_MB * 1024 * 1024) {
        return NextResponse.json({ error: 'ไฟล์รูปใหญ่เกินไป กรุณาลองรูปอื่น' }, { status: 400 })
      }
      const url = await putObject(`${base}-${w}w.webp`, part, 'image/webp')
      sized.push({ width: w, url })
    }

    if (sized.length > 0) {
      const defaultUrl = sized.find((s) => s.width === 960)?.url ?? sized[sized.length - 1].url
      const srcset = sized.map((s) => `${s.url} ${s.width}w`).join(', ')
      return NextResponse.json({ url: defaultUrl, srcset, sizes: sized })
    }

    // ── fallback: a lone image with no variants — store it once, no resize ─
    if (single instanceof File && single.type.startsWith('image/')) {
      if (single.size > MAX_VARIANT_MB * 1024 * 1024) {
        return NextResponse.json({ error: 'ไฟล์รูปใหญ่เกินไป กรุณาลองรูปอื่น' }, { status: 400 })
      }
      const url = await putObject(`${base}-960w.webp`, single, single.type || 'image/webp')
      return NextResponse.json({ url, srcset: `${url} 960w`, sizes: [{ width: 960, url }] })
    }

    return NextResponse.json({ error: 'No file' }, { status: 400 })
  } catch (err) {
    console.error('upload route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ' }, { status: 500 })
  }
}
