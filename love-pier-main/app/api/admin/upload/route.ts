import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// The client (lib/upload-image.ts) downscales images before posting, so the
// three sharp resizes here are cheap — but give the function real headroom
// anyway so a slow Supabase round-trip can't 504 into an opaque failure.
export const maxDuration = 30

const BUCKET = 'uploads'
const WIDTHS = [480, 960, 1440]
const MAX_INPUT_MB = 20
const MAX_VIDEO_MB = 100

// sharp is a native addon. Loading it at module scope means a missing prebuilt
// binary on the deployed function throws before the handler runs — a 500 with
// an HTML body that the client can only show as a generic failure. Import it
// lazily inside the handler so that failure comes back as a real JSON message.
type SharpFactory = (typeof import('sharp'))['default']
async function loadSharp(): Promise<SharpFactory> {
  const mod = await import('sharp')
  return (mod.default ?? (mod as unknown as SharpFactory))
}

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// TEMP health check — no auth, no data access. Confirms the sharp native
// binary actually loads on the deployed function, and (on failure) reports
// what @img/* packages the function actually shipped with. Remove once the
// image upload is verified working in production.
export async function GET() {
  const diag: Record<string, unknown> = {}
  try {
    const { readdirSync, existsSync } = await import('node:fs')
    const { createRequire } = await import('node:module')
    const req = createRequire(import.meta.url)
    for (const cand of ['sharp/package.json', '@img/sharp-linux-x64/package.json', '@img/sharp-libvips-linux-x64/package.json', '@img/sharp-linuxmusl-x64/package.json']) {
      try { diag[cand] = req(cand).version } catch (e) { diag[cand] = 'NOT RESOLVED: ' + (e instanceof Error ? e.message : String(e)) }
    }
    for (const dir of [req.resolve('sharp/package.json').replace(/sharp\/package\.json$/, '@img'), process.cwd() + '/node_modules/@img']) {
      try { diag['ls ' + dir] = existsSync(dir) ? readdirSync(dir) : 'MISSING' } catch (e) { diag['ls ' + dir] = String(e) }
    }
  } catch (e) {
    diag.introspectError = String(e)
  }
  try {
    const sharp = await loadSharp()
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer()
    return NextResponse.json({ sharp: 'ok', bytes: png.length, diag })
  } catch (err) {
    return NextResponse.json(
      { sharp: 'FAILED', error: err instanceof Error ? err.message : String(err), diag },
      { status: 500 }
    )
  }
}

function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
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

    let sharp: SharpFactory
    try {
      sharp = await loadSharp()
    } catch (err) {
      console.error('sharp failed to load:', err)
      return NextResponse.json(
        { error: 'ระบบย่อรูปไม่พร้อมใช้งาน (sharp): ' + (err instanceof Error ? err.message : String(err)) },
        { status: 500 }
      )
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
  } catch (err) {
    // Anything unhandled still leaves as JSON, not an HTML 500 the client
    // can't parse.
    console.error('upload route error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'อัปโหลดไม่สำเร็จ' }, { status: 500 })
  }
}
