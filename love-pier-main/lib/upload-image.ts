export type UploadResult = { url: string; srcset: string }

const HEIC_RE = /\.(heic|heif)$/i

// The server resizes with sharp, whose prebuilt build has no HEVC decoder, so
// iPhone .heic photos fail there. Convert them to JPEG in the browser first.
async function normalizeHeic(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' || file.type === 'image/heif' || HEIC_RE.test(file.name)
  if (!isHeic) return file
  const heic2any = (await import('heic2any')).default
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(out) ? out[0] : out
  const name = file.name.replace(HEIC_RE, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

export async function uploadImage(file: File): Promise<UploadResult> {
  // HEIC files sometimes report an empty MIME type, so allow the extension too.
  if (!file.type.startsWith('image/') && !HEIC_RE.test(file.name)) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }
  const uploadFile = await normalizeHeic(file)
  const fd = new FormData()
  fd.append('file', uploadFile)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Upload failed' }))
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
