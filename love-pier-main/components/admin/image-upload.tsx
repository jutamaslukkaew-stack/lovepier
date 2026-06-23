'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadMenuImage } from '@/lib/upload-image'
import { Button } from '@/components/ui/button'

export function ImageUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadMenuImage(file)
      onChange(url)
      toast.success('อัพโหลดรูปแล้ว')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'อัพโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="relative w-40 overflow-hidden rounded-lg border">
          <Image
            src={value}
            alt="ตัวอย่างรูปเมนู"
            width={160}
            height={160}
            className="aspect-square w-full object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground shadow hover:bg-background"
            aria-label="ลบรูป"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square w-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          {uploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <>
              <ImagePlus className="size-6" />
              <span className="text-xs">อัพโหลดรูป</span>
            </>
          )}
        </button>
      )}
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'กำลังอัพโหลด…' : 'เปลี่ยนรูป'}
        </Button>
      )}
    </div>
  )
}
