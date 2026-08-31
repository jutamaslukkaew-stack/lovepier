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

// Shrink in the browser BEFORE the POST. /api/admin/upload runs on a Vercel
// serverless function, which rejects a request body over ~4.5MB before the
// route ever sees it — and even under that, a full-res phone photo (a 12MP
// 3:4 shot is often 4-8MB) makes the three sharp resizes time out. Either
// failure comes back as a non-JSON response, which the caller can only
// surface as a generic "Upload failed". Downscaling here keeps the upload a
// few hundred KB; the server still generates the 480/960/1440 srcset from it.
async function shrinkForUpload(file: File): Promise<File> {
  // Leave GIFs alone — re-encoding flattens the animation.
  if (file.type === 'image/gif') return file
  try {
    const imageCompression = (await import('browser-image-compression')).default
    const out = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: 'image/jpeg',
    })
    if (out instanceof File) return out
    return new File([out], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Best effort: if compression fails, let the server try the original.
    return file
  }
}

export async function uploadImage(file: File): Promise<UploadResult> {
  // HEIC files sometimes report an empty MIME type, so allow the extension too.
  if (!file.type.startsWith('image/') && !HEIC_RE.test(file.name)) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }
  const uploadFile = await shrinkForUpload(await normalizeHeic(file))
  // Compression should land well under this; if it threw and we're still
  // holding a big original, say so clearly instead of letting Vercel reject
  // the body with an opaque non-JSON error.
  if (uploadFile.size > 4 * 1024 * 1024) {
    throw new Error('รูปนี้ใหญ่เกินไป ลองถ่าย/บันทึกใหม่ให้เล็กลง หรือเลือกรูปอื่น')
  }
  const fd = new FormData()
  fd.append('file', uploadFile)
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
