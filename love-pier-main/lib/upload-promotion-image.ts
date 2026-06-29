import imageCompression from 'browser-image-compression'
import { createClient } from '@/lib/supabase/client'

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_PROMOTIONS_BUCKET ?? 'promotions'
const MAX_BYTES = 5 * 1024 * 1024 // 5MB

export type UploadResult = { url: string; path: string }

export async function uploadPromotionImage(file: File): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('ไฟล์ใหญ่เกิน 5MB')
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/webp',
  })

  const supabase = createClient()
  const path = `items/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) {
    throw new Error('อัพโหลดรูปไม่สำเร็จ: ' + error.message)
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}
