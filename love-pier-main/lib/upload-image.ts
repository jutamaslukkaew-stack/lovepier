export type UploadResult = { url: string; srcset: string }

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(error ?? 'อัปโหลดไม่สำเร็จ')
  }
  const json = await res.json()
  return { url: json.url, srcset: json.srcset ?? '' }
}

// Alias for backward-compatibility
export { uploadImage as uploadMenuImage }
