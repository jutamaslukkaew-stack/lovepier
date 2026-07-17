'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { Event } from '@/lib/db/schema'

const MAX_ALBUM_IMAGES = 10

type FormData = {
  titleTh: string
  titleEn: string
  titleZh: string
  titleEm: string
  eventDate: string
  endDate: string
  timeRange: string
  timeSub: string
  location: string
  organizer: string
  price: string
  entrySubTh: string
  entrySubEn: string
  entrySubZh: string
  registrationInfoTh: string
  registrationInfoEn: string
  registrationInfoZh: string
  descriptionTh: string
  descriptionEn: string
  descriptionZh: string
  categoryTh: string
  categoryEn: string
  categoryZh: string
  imageUrl: string
  albumImages: string[]
  isFeatured: boolean
  isActive: boolean
}

const EMPTY: FormData = {
  titleTh: '', titleEn: '', titleZh: '', titleEm: '',
  eventDate: '', endDate: '', timeRange: '', timeSub: '', location: '', organizer: '',
  price: '', entrySubTh: '', entrySubEn: '', entrySubZh: '',
  registrationInfoTh: '', registrationInfoEn: '', registrationInfoZh: '',
  descriptionTh: '', descriptionEn: '', descriptionZh: '',
  categoryTh: '', categoryEn: '', categoryZh: '',
  imageUrl: '', albumImages: [], isFeatured: false, isActive: true,
}

export type EventForm = FormData

export function EventModal({
  event,
  onClose,
  onSave,
}: {
  event: Event | null
  onClose: () => void
  onSave: (data: FormData) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(EMPTY)
  const [lang, setLang] = useState<'th' | 'en' | 'zh'>('th')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingAlbum, setUploadingAlbum] = useState(false)
  const [albumLimitMsg, setAlbumLimitMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const albumFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (event) {
      setForm({
        titleTh: event.titleTh,
        titleEn: event.titleEn,
        titleZh: event.titleZh,
        titleEm: event.titleEm,
        eventDate: event.eventDate ?? '',
        endDate: (event as any).endDate ?? '',
        timeRange: event.timeRange,
        timeSub: event.timeSub,
        location: event.location,
        organizer: (event as any).organizer ?? '',
        price: event.price != null ? String(event.price) : '',
        entrySubTh: event.entrySubTh,
        entrySubEn: event.entrySubEn,
        entrySubZh: event.entrySubZh,
        registrationInfoTh: (event as any).registrationInfoTh ?? '',
        registrationInfoEn: (event as any).registrationInfoEn ?? '',
        registrationInfoZh: (event as any).registrationInfoZh ?? '',
        descriptionTh: event.descriptionTh,
        descriptionEn: event.descriptionEn,
        descriptionZh: event.descriptionZh,
        categoryTh: event.categoryTh,
        categoryEn: event.categoryEn,
        categoryZh: event.categoryZh,
        imageUrl: event.imageUrl ?? '',
        albumImages: (event as any).albumImages ?? [],
        isFeatured: event.isFeatured,
        isActive: event.isActive,
      })
    } else {
      setForm(EMPTY)
    }
    setLang('th')
  }, [event])

  const set = (key: keyof FormData, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }))

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const { uploadImage } = await import('@/lib/upload-image')
      const { url } = await uploadImage(file)
      set('imageUrl', url)
    } finally {
      setUploading(false)
    }
  }

  async function handleAlbumUpload(files: FileList) {
    setAlbumLimitMsg('')
    const remaining = MAX_ALBUM_IMAGES - form.albumImages.length
    const incoming = Array.from(files)
    const toUpload = incoming.slice(0, remaining)
    if (incoming.length > toUpload.length) {
      setAlbumLimitMsg(`อัลบัมรูปภาพได้สูงสุด ${MAX_ALBUM_IMAGES} รูป — เพิ่มได้อีกแค่ ${remaining} รูป`)
    }
    if (toUpload.length === 0) {
      if (albumFileRef.current) albumFileRef.current.value = ''
      return
    }
    setUploadingAlbum(true)
    try {
      const { uploadImage } = await import('@/lib/upload-image')
      const urls: string[] = []
      for (const file of toUpload) {
        const { url } = await uploadImage(file)
        urls.push(url)
      }
      setForm((f) => ({ ...f, albumImages: [...f.albumImages, ...urls].slice(0, MAX_ALBUM_IMAGES) }))
    } finally {
      setUploadingAlbum(false)
      if (albumFileRef.current) albumFileRef.current.value = ''
    }
  }

  function removeAlbumImage(idx: number) {
    setAlbumLimitMsg('')
    setForm((f) => ({ ...f, albumImages: f.albumImages.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const langSuffix = lang === 'th' ? 'Th' : lang === 'en' ? 'En' : 'Zh'
  const tabCls = (l: string) =>
    `px-3 py-1 text-xs rounded-full font-semibold uppercase tracking-widest transition-colors ${
      lang === l ? 'bg-[#4a3520] text-white' : 'bg-[#4a3520]/10 text-[#4a3520]/70 hover:bg-[#4a3520]/20'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4 z-10">
          <h2 className="text-base font-semibold">
            {event ? 'แก้ไขอีเวนต์' : 'เพิ่มอีเวนต์'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Language tabs */}
          <div className="flex gap-2">
            {(['th', 'en', 'zh'] as const).map((l) => (
              <button key={l} type="button" className={tabCls(l)} onClick={() => setLang(l)}>
                {l === 'th' ? 'ไทย' : l === 'en' ? 'EN' : '中文'}
              </button>
            ))}
          </div>

          {/* Multilingual title */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ชื่ออีเวนต์ ({lang.toUpperCase()})</label>
              <Input
                value={form[`title${langSuffix}` as keyof FormData] as string}
                onChange={(e) => set(`title${langSuffix}` as keyof FormData, e.target.value)}
                required={lang === 'th'}
                placeholder={lang === 'th' ? 'Flow Sunset' : lang === 'en' ? 'Flow Sunset' : 'Flow Sunset'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ชื่อเอน (italic เน้น)</label>
              <Input
                value={form.titleEm}
                onChange={(e) => set('titleEm', e.target.value)}
                placeholder="Sunset"
              />
            </div>
          </div>

          {/* Date / time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันที่เริ่ม</label>
              <Input type="date" value={form.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วันที่สิ้นสุด (ถ้ามีหลายวัน)</label>
              <Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">เวลา</label>
              <Input value={form.timeRange} onChange={(e) => set('timeRange', e.target.value)} placeholder="16:00 – 20:00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">เวลาย่อย</label>
              <Input value={form.timeSub} onChange={(e) => set('timeSub', e.target.value)} placeholder="DJ SUPACHAI 18:00" />
            </div>
          </div>

          {/* Location / Organizer / Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">สถานที่ (Venue)</label>
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="The Symphony Club" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ผู้จัด (Organizer)</label>
              <Input value={form.organizer} onChange={(e) => set('organizer', e.target.value)} placeholder="Love Pier Beach Cafe" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">หมวดหมู่ ({lang.toUpperCase()})</label>
            <Input
              value={form[`category${langSuffix}` as keyof FormData] as string}
              onChange={(e) => set(`category${langSuffix}` as keyof FormData, e.target.value)}
              placeholder={lang === 'th' ? 'ปาร์ตี้' : lang === 'en' ? 'Party' : '派对'}
            />
          </div>

          {/* Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ราคา (บาท, ว่าง = ฟรี)</label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="500"
                min="0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ข้อความหลังราคา ({lang.toUpperCase()})</label>
              <Input
                value={form[`entrySub${langSuffix}` as keyof FormData] as string}
                onChange={(e) => set(`entrySub${langSuffix}` as keyof FormData, e.target.value)}
                placeholder={lang === 'th' ? 'เล่นกิจกรรมไม่จำกัด' : lang === 'en' ? 'Unlimited activities' : '无限活动'}
              />
            </div>
          </div>

          {/* Registration & tickets */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">ข้อมูลการลงทะเบียน/บัตร ({lang.toUpperCase()})</label>
            <Input
              value={form[`registrationInfo${langSuffix}` as keyof FormData] as string}
              onChange={(e) => set(`registrationInfo${langSuffix}` as keyof FormData, e.target.value)}
              placeholder={lang === 'th' ? 'ไม่ต้องสำรองที่นั่งล่วงหน้า' : lang === 'en' ? 'No reservation required' : '无需预订'}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">คำอธิบาย ({lang.toUpperCase()})</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y"
              value={form[`description${langSuffix}` as keyof FormData] as string}
              onChange={(e) => set(`description${langSuffix}` as keyof FormData, e.target.value)}
              placeholder="Surf Pool · Skimboard · Kayak..."
            />
          </div>

          {/* Image */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">รูปภาพ</label>
            <div className="flex gap-2 items-center">
              <Input
                value={form.imageUrl}
                onChange={(e) => set('imageUrl', e.target.value)}
                placeholder="/uploads/event-poster.webp"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }} />
            </div>
            {form.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.imageUrl} alt="" className="mt-2 h-24 rounded-md object-cover" />
            )}
          </div>

          {/* Album images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                อัลบัมรูปภาพ ({form.albumImages.length}/{MAX_ALBUM_IMAGES} รูป)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => albumFileRef.current?.click()}
                disabled={uploadingAlbum || form.albumImages.length >= MAX_ALBUM_IMAGES}
              >
                {uploadingAlbum ? 'กำลังอัปโหลด...' : '+ เพิ่มรูป'}
              </Button>
              <input
                ref={albumFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) handleAlbumUpload(e.target.files) }}
              />
            </div>
            {albumLimitMsg && <p className="text-xs text-amber-600">{albumLimitMsg}</p>}
            {form.albumImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.albumImages.map((url, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAlbumImage(i)}
                      className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.isFeatured} onCheckedChange={(v) => set('isFeatured', v)} />
              <span>Pinned (featured event)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              <span>แสดงผล</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>ยกเลิก</Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
