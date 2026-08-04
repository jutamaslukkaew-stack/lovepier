import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { eq, sql as dsql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { menuItems } from '@/lib/db/schema'

// Bucket + resize settings copied VERBATIM from app/api/admin/upload/route.ts so
// import images are byte-for-byte comparable to those uploaded one at a time.
export const BUCKET = 'uploads'
export const WIDTHS = [480, 960, 1440] as const
const WEBP = { quality: 82, effort: 4 } as const
const DEFAULT_WIDTH = 960

export const RAW_PREFIX = 'menu/_raw'

export function rawPath(importCode: string, ext: string): string {
  return `${RAW_PREFIX}/${encodeCode(importCode)}.${ext.toLowerCase()}`
}
export function sizePath(importCode: string, width: number): string {
  return `menu/${encodeCode(importCode)}/${width}.webp`
}
// import_code contains characters that are fine in a storage key ("9.5_03"),
// but keep it defensive against path separators.
function encodeCode(code: string): string {
  return code.replace(/[/\\]/g, '_')
}

export function serviceSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export type ProcessResult = { importCode: string; ok: boolean; imageUrl?: string; error?: string }

/**
 * Download one already-uploaded raw file, produce the 3 webp sizes, write them
 * to menu/{code}/{size}.webp, delete the raw original, and — if a menu_items
 * row for this import_code exists — set its image_url (960w) and bump
 * image_version for cache-busting. Never writes a null image_url.
 */
export async function processRawImage(importCode: string, ext: string): Promise<ProcessResult> {
  const sb = serviceSupabase()
  const raw = rawPath(importCode, ext)

  const dl = await sb.storage.from(BUCKET).download(raw)
  if (dl.error || !dl.data) return { importCode, ok: false, error: `ดาวน์โหลดไฟล์ต้นฉบับไม่ได้: ${dl.error?.message ?? 'not found'}` }
  const input = Buffer.from(await dl.data.arrayBuffer())

  try {
    await Promise.all(
      WIDTHS.map(async (w) => {
        const webp = await sharp(input)
          .resize({ width: w, withoutEnlargement: true })
          .webp(WEBP)
          .toBuffer()
        // Blob, not Buffer — a Node Buffer is sent as a raw fetch body that some
        // serverless runtimes (Vercel) coerce to a UTF-8 string, corrupting the
        // binary (high bytes → U+FFFD �). A Blob is sent as binary-safe multipart.
        const { error } = await sb.storage.from(BUCKET).upload(sizePath(importCode, w), new Blob([new Uint8Array(webp)], { type: 'image/webp' }), {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true, // re-import overwrites in place (cache-busting via image_version)
        })
        if (error) throw new Error(error.message)
      })
    )
  } catch (err) {
    return { importCode, ok: false, error: err instanceof Error ? err.message : 'แปลงรูปไม่สำเร็จ' }
  }

  // best-effort cleanup of the raw original
  await sb.storage.from(BUCKET).remove([raw])

  const { data } = sb.storage.from(BUCKET).getPublicUrl(sizePath(importCode, DEFAULT_WIDTH))
  const imageUrl = data.publicUrl

  // Attach to the menu row when it exists. image-only uploads before the Excel
  // commit simply leave the files in storage; commit will pick up image_url.
  const updated = await db
    .update(menuItems)
    .set({ imageUrl, imageVersion: dsql`${menuItems.imageVersion} + 1`, updatedAt: new Date() })
    .where(eq(menuItems.importCode, importCode))
    .returning({ id: menuItems.id })

  return { importCode, ok: true, imageUrl: updated.length ? imageUrl : undefined }
}
