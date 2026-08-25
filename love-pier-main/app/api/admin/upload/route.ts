import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const BUCKET = 'uploads'
const WIDTHS = [480, 960, 1440]
const MAX_INPUT_MB = 20
const MAX_VIDEO_MB = 100

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) return NextResponse.json({ error: `วิดีโอใหญ่เกิน ${MAX_VIDEO_MB}MB` }, { status: 400 })
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'
    const path = `video/${crypto.randomUUID()}.${ext}`
    const supabase = serviceSupabase()
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type, cacheControl: '31536000', upsert: false,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ url: data.publicUrl, type: 'video' })
  }
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'รองรับเฉพาะรูปภาพหรือวิดีโอ' }, { status: 400 })
  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    return NextResponse.json({ error: `ไฟล์ใหญ่เกิน ${MAX_INPUT_MB}MB` }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base = `img/${crypto.randomUUID()}`
  const supabase = serviceSupabase()

  // Generate and upload each size in parallel — each width is independent
  let uploaded: { width: number; url: string }[]
  try {
    uploaded = await Promise.all(WIDTHS.map(async (w) => {
      const webp = await sharp(buffer)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer()

      const path = `${base}-${w}w.webp`
      // Upload as a Blob, not a Node Buffer: supabase-js sends a Buffer as a raw
      // fetch body, which some serverless runtimes (Vercel) coerce to a UTF-8
      // string — corrupting the binary (high bytes become the U+FFFD �, EF BF BD)
      // so the stored .webp is broken. A Blob is sent as multipart, always binary-safe.
      const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([new Uint8Array(webp)], { type: 'image/webp' }), {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: false,
      })
      if (error) throw new Error(error.message)

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      return { width: w, url: data.publicUrl }
    }))
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 })
  }

  // Default URL = 960w (middle size)
  const defaultUrl = uploaded.find((u) => u.width === 960)?.url ?? uploaded[uploaded.length - 1].url
  const srcset = uploaded.map((u) => `${u.url} ${u.width}w`).join(', ')

  return NextResponse.json({ url: defaultUrl, srcset, sizes: uploaded })
}
