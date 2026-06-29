'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { uploadPromotionImage } from '@/lib/upload-promotion-image'
import type { Promotion } from '@/lib/db/schema'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

const TAG_OPTIONS = [
  { value: 'dine-in', label: 'Dine-in' },
  { value: 'take-away', label: 'Take-away' },
  { value: 'daily', label: 'Daily' },
  { value: 'to-share', label: 'To Share' },
  { value: 'weekend-only', label: 'Weekend Only' },
]

type FormState = {
  titleTh: string
  titleEn: string
  titleZh: string
  descriptionTh: string
  descriptionEn: string
  descriptionZh: string
  category: string
  imageUrl: string
  priceCurrent: string
  priceOriginal: string
  discountLabel: string
  tags: string[]
  isActive: boolean
  validFrom: string
  validUntil: string
}

const empty: FormState = {
  titleTh: '',
  titleEn: '',
  titleZh: '',
  descriptionTh: '',
  descriptionEn: '',
  descriptionZh: '',
  category: '',
  imageUrl: '',
  priceCurrent: '',
  priceOriginal: '',
  discountLabel: '',
  tags: [],
  isActive: true,
  validFrom: '',
  validUntil: '',
}

function toForm(p: Promotion): FormState {
  return {
    titleTh: p.titleTh,
    titleEn: p.titleEn,
    titleZh: p.titleZh,
    descriptionTh: p.descriptionTh,
    descriptionEn: p.descriptionEn,
    descriptionZh: p.descriptionZh,
    category: p.category,
    imageUrl: p.imageUrl ?? '',
    priceCurrent: String(p.priceCurrent),
    priceOriginal: p.priceOriginal != null ? String(p.priceOriginal) : '',
    discountLabel: p.discountLabel ?? '',
    tags: p.tags ?? [],
    isActive: p.isActive,
    validFrom: p.validFrom ?? '',
    validUntil: p.validUntil ?? '',
  }
}

export function PromotionModal({
  open,
  promotion,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  promotion: Promotion | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setForm(promotion ? toForm(promotion) : empty)
    }
  }, [open, promotion])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }))
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const { url } = await uploadPromotionImage(file)
      set('imageUrl', url)
      toast.success('อัพโหลดรูปแล้ว')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'อัพโหลดไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titleTh.trim()) {
      toast.error('กรุณากรอกชื่อภาษาไทย')
      return
    }
    if (!form.priceCurrent || isNaN(Number(form.priceCurrent))) {
      toast.error('กรุณากรอกราคาปัจจุบัน')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        priceCurrent: Number(form.priceCurrent),
        priceOriginal: form.priceOriginal ? Number(form.priceOriginal) : null,
        validFrom: form.validFrom || null,
        validUntil: form.validUntil || null,
      }
      const url = promotion
        ? `/api/admin/promotions/${promotion.id}`
        : '/api/admin/promotions'
      const method = promotion ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('บันทึกไม่สำเร็จ')
      toast.success(promotion ? 'อัปเดตโปรโมชันแล้ว' : 'เพิ่มโปรโมชันแล้ว')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{promotion ? 'แก้ไขโปรโมชัน' : 'เพิ่มโปรโมชัน'}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {/* Image upload */}
          <div>
            <p className="mb-1.5 text-sm font-medium">รูปภาพ</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {form.imageUrl ? (
              <div className="relative w-40 overflow-hidden rounded-lg border">
                <Image
                  src={form.imageUrl}
                  alt="ตัวอย่างรูป"
                  width={160}
                  height={160}
                  className="aspect-square w-full object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => set('imageUrl', '')}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 shadow hover:bg-background"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
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
            {form.imageUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'กำลังอัพโหลด…' : 'เปลี่ยนรูป'}
              </Button>
            )}
          </div>

          {/* Title tabs */}
          <div>
            <p className="mb-1.5 text-sm font-medium">ชื่อโปรโมชัน</p>
            <Tabs defaultValue="th">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="th">ไทย</TabsTrigger>
                <TabsTrigger value="en">EN</TabsTrigger>
                <TabsTrigger value="zh">中文</TabsTrigger>
              </TabsList>
              <TabsContent value="th" className="mt-2">
                <Input
                  placeholder="ชื่อภาษาไทย *"
                  value={form.titleTh}
                  onChange={(e) => set('titleTh', e.target.value)}
                />
              </TabsContent>
              <TabsContent value="en" className="mt-2">
                <Input
                  placeholder="Title in English"
                  value={form.titleEn}
                  onChange={(e) => set('titleEn', e.target.value)}
                />
              </TabsContent>
              <TabsContent value="zh" className="mt-2">
                <Input
                  placeholder="中文标题"
                  value={form.titleZh}
                  onChange={(e) => set('titleZh', e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Description tabs */}
          <div>
            <p className="mb-1.5 text-sm font-medium">คำอธิบาย</p>
            <Tabs defaultValue="th">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="th">ไทย</TabsTrigger>
                <TabsTrigger value="en">EN</TabsTrigger>
                <TabsTrigger value="zh">中文</TabsTrigger>
              </TabsList>
              <TabsContent value="th" className="mt-2">
                <Textarea
                  rows={3}
                  placeholder="คำอธิบายภาษาไทย"
                  value={form.descriptionTh}
                  onChange={(e) => set('descriptionTh', e.target.value)}
                />
              </TabsContent>
              <TabsContent value="en" className="mt-2">
                <Textarea
                  rows={3}
                  placeholder="Description in English"
                  value={form.descriptionEn}
                  onChange={(e) => set('descriptionEn', e.target.value)}
                />
              </TabsContent>
              <TabsContent value="zh" className="mt-2">
                <Textarea
                  rows={3}
                  placeholder="中文描述"
                  value={form.descriptionZh}
                  onChange={(e) => set('descriptionZh', e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">หมวดหมู่</label>
            <Input
              placeholder="เช่น อาหาร, เครื่องดื่ม"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">ราคาปัจจุบัน (฿) *</label>
              <Input
                inputMode="numeric"
                placeholder="350"
                value={form.priceCurrent}
                onChange={(e) => set('priceCurrent', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">ราคาเดิม (฿)</label>
              <Input
                inputMode="numeric"
                placeholder="450"
                value={form.priceOriginal}
                onChange={(e) => set('priceOriginal', e.target.value)}
              />
            </div>
          </div>

          {/* Discount label */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">ป้ายส่วนลด</label>
            <Input
              placeholder="เช่น 18% หรือ 1 FREE DRINK"
              value={form.discountLabel}
              onChange={(e) => set('discountLabel', e.target.value)}
            />
          </div>

          {/* Tags */}
          <div>
            <p className="mb-1.5 text-sm font-medium">แท็ก</p>
            <div className="flex flex-wrap gap-3">
              {TAG_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.tags.includes(t.value)}
                    onChange={() => toggleTag(t.value)}
                    className="rounded border-gray-300"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">เริ่มต้น</label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(e) => set('validFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">สิ้นสุด</label>
              <Input
                type="date"
                value={form.validUntil}
                onChange={(e) => set('validUntil', e.target.value)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set('isActive', v)}
              id="promo-active"
            />
            <label htmlFor="promo-active" className="text-sm">เปิดใช้งาน</label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : promotion ? 'อัปเดต' : 'เพิ่ม'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
