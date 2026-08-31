export type UploadResult = { url: string; srcset: string }

const HEIC_RE = /\.(heic|heif)$/i

// The server resizes with sharp, whose prebuilt build has no HEVC decoder, so
// iPhone .heic photos fail there. Convert them to JPEG in the browser first.
async function normalizeHeic(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' || file.type === 'image/heif' || HEIC_RE.test(file.name)
  if (!isHeic) return file
  try {
    const heic2any = (await import('heic2any')).default
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(out) ? out[0] : out
    const name = file.name.replace(HEIC_RE, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    // heic2any (v0.0.4) chokes on some HEICs. Fall through with the original —
    // shrinkForUpload decodes via a <canvas>, which Safari (the iPad admin's
    // browser) can do for HEIC natively, so this often still recovers.
    return file
  }
}

// The 480/960/1440 responsive widths, generated HERE in the browser. The
// server route does no image processing any more (its sharp binary kept
// failing to load on Vercel) — it just stores whatever webp variants we
// send. browser-image-compression decodes via <canvas>, so it also handles
// a HEIC that heic2any couldn't (Safari decodes HEIC natively).
const VARIANT_WIDTHS = [480, 960, 1440] as const

async function toWebpVariant(file: File, maxWidthOrHeight: number): Promise<File> {
  const imageCompression = (await import('browser-image-compression')).default
  const out = await imageCompression(file, {
    maxWidthOrHeight,
    maxSizeMB: 1.5,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.82,
  })
  const blob = out instanceof Blob ? out : new Blob([out], { type: 'image/webp' })
  return new File([blob], `variant-${maxWidthOrHeight}.webp`, { type: 'image/webp' })
}

export async function uploadImage(file: File): Promise<UploadResult> {
  // HEIC files sometimes report an empty MIME type, so allow the extension too.
  if (!file.type.startsWith('image/') && !HEIC_RE.test(file.name)) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }
  const source = await normalizeHeic(file)

  const fd = new FormData()
  let madeVariant = false
  try {
    const variants = await Promise.all(
      VARIANT_WIDTHS.map((w) => toWebpVariant(source, w))
    )
    variants.forEach((v, i) => fd.append(`variant-${VARIANT_WIDTHS[i]}`, v))
    madeVariant = true
  } catch {
    // Compression unavailable (very old browser, blocked worker) — send the
    // original and let the server store it as a single size.
    fd.append('file', source)
  }
  // If a variant somehow came back huge, still guard the request size.
  if (madeVariant) {
    const total = VARIANT_WIDTHS.reduce((n, w) => {
      const v = fd.get(`variant-${w}`)
      return n + (v instanceof File ? v.size : 0)
    }, 0)
    if (total > 10 * 1024 * 1024) {
      throw new Error('รูปนี้ใหญ่เกินไป ลองรูปอื่นหรือย่อขนาดก่อน')
    }
  }

  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'อัปโหลดไม่สำเร็จ ลองใหม่อีกครั้ง' }))
    throw new Error(error ?? 'อัปโหลดไม่สำเร็จ')
  }
  const json = await res.json()
  return { url: json.url, srcset: json.srcset ?? '' }
}

export async function uploadMedia(file: File): Promise<{ url: string; type: 'image' | 'video' }> {
  if (file.type.startsWith('image/')) {
    const result = await uploadImage(file)
    return { url: result.url, type: 'image' }
  }
  if (!file.type.startsWith('video/')) throw new Error('ไฟล์ต้องเป็นรูปภาพหรือวิดีโอ')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error || 'อัปโหลดไม่สำเร็จ')
  }
  const body = await res.json()
  return { url: body.url, type: 'video' }
}

// Alias for backward-compatibility
export { uploadImage as uploadMenuImage }
