'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createPreorderItem, setPreorderItemDeleted, setPreorderItemStatus, updatePreorderItem } from '@/app/admin/actions/preorder-items'
import { uploadMedia } from '@/lib/upload-image'
import type { PreorderItem } from '@/lib/db/schema'

type Media = { type: 'image' | 'video'; url: string; label?: string }
const empty = { nameTh: '', descriptionTh: '', category: 'อาหารพรีออเดอร์', price: '', unit: 'ชุด', minQuantity: '1', leadDays: '3', dailyQuota: '', coverImageUrl: '', media: [] as Media[], status: 'draft' }

function formOf(item: PreorderItem) {
  return { nameTh: item.nameTh, descriptionTh: item.descriptionTh, category: item.category, price: item.price == null ? '' : String(item.price), unit: item.unit, minQuantity: String(item.minQuantity), leadDays: String(item.leadDays), dailyQuota: item.dailyQuota == null ? '' : String(item.dailyQuota), coverImageUrl: item.coverImageUrl || '', media: Array.isArray(item.media) ? item.media as Media[] : [], status: item.status }
}

export function PreorderMenuManager({ items }: { items: PreorderItem[] }) {
  const [editing, setEditing] = useState<PreorderItem | null | 'new'>(null)
  const [form, setForm] = useState(empty)
  const [showTrash, setShowTrash] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video')
  const [pending, startTransition] = useTransition()
  const mediaRef = useRef<HTMLInputElement>(null)
  const set = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }))
  const visible = items.filter((item) => item.isDeleted === showTrash)

  function open(item?: PreorderItem) {
    setEditing(item || 'new')
    setForm(item ? formOf(item) : empty)
  }

  async function upload(files: FileList) {
    setUploading(true)
    try {
      const uploaded: Media[] = []
      for (const file of Array.from(files).slice(0, 10)) uploaded.push(await uploadMedia(file))
      setForm((current) => ({ ...current, coverImageUrl: current.coverImageUrl || uploaded.find((m) => m.type === 'image')?.url || '', media: [...current.media, ...uploaded] }))
    } catch (error) { toast.error(error instanceof Error ? error.message : 'อัปโหลดไม่สำเร็จ') }
    finally { setUploading(false) }
  }

  function save() {
    startTransition(async () => {
      const result = editing === 'new' ? await createPreorderItem(form) : await updatePreorderItem(editing!.id, form)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('บันทึกเมนูแล้ว')
      setEditing(null)
    })
  }

  if (editing) return (
    <Card><CardContent className="space-y-5 pt-6">
      <div><h2 className="text-xl font-semibold">{editing === 'new' ? 'เพิ่มเมนู Pre Order' : `แก้ไข ${editing.nameTh}`}</h2><p className="text-sm text-muted-foreground">เมนูที่ยังไม่มีราคาจะถูกเก็บเป็นแบบร่าง</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>ชื่อเมนู</Label><Input value={form.nameTh} onChange={(e) => set('nameTh', e.target.value)} /></div>
        <div><Label>หมวดหมู่</Label><Input value={form.category} onChange={(e) => set('category', e.target.value)} /></div>
        <div className="md:col-span-2"><Label>รายละเอียด</Label><Textarea value={form.descriptionTh} onChange={(e) => set('descriptionTh', e.target.value)} /></div>
        <div><Label>ราคา (บาท)</Label><Input inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div><Label>หน่วยขาย</Label><Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="ชุด / กิโลกรัม / กล่อง" /></div>
        <div><Label>จำนวนขั้นต่ำ</Label><Input inputMode="numeric" value={form.minQuantity} onChange={(e) => set('minQuantity', e.target.value)} /></div>
        <div><Label>สั่งล่วงหน้าอย่างน้อย (วัน)</Label><Input type="number" min="3" value={form.leadDays} onChange={(e) => set('leadDays', e.target.value)} /></div>
        <div><Label>โควตาต่อวัน</Label><Input inputMode="numeric" value={form.dailyQuota} onChange={(e) => set('dailyQuota', e.target.value)} placeholder="เว้นว่าง = ไม่จำกัด" /></div>
        <div><Label>สถานะ</Label><select className="mt-2 h-10 w-full rounded-md border bg-background px-3" value={form.status} onChange={(e) => set('status', e.target.value)}><option value="draft">แบบร่าง</option><option value="active">เปิดขาย</option><option value="paused">ปิดรับชั่วคราว</option><option value="seasonal">หมดฤดูกาล</option></select></div>
      </div>
      <div className="space-y-3 border-t pt-4"><Label>รูปภาพและวิดีโอ</Label><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => mediaRef.current?.click()} disabled={uploading}><ImagePlus className="size-4" />{uploading ? 'กำลังอัปโหลด…' : 'เพิ่มรูป/วิดีโอ'}</Button><input ref={mediaRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && upload(e.target.files)} /></div>
        <div className="flex flex-col gap-2 sm:flex-row"><select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'video')} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="video">วิดีโอ URL / YouTube</option><option value="image">รูปภาพ URL</option></select><Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://..." /><Button type="button" variant="outline" onClick={() => { const url = mediaUrl.trim(); if (!url) return; set('media', [...form.media, { type: mediaType, url }]); if (mediaType === 'image' && !form.coverImageUrl) set('coverImageUrl', url); setMediaUrl('') }}>เพิ่ม URL</Button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{form.media.map((media, index) => <div key={`${media.url}-${index}`} className="relative overflow-hidden rounded-lg border bg-black/5">{media.type === 'video' ? <video src={media.url} controls className="aspect-video w-full object-cover" /> : <img src={media.url} alt="" className="aspect-video w-full object-cover" />}<button type="button" className="absolute right-1 top-1 rounded bg-black/70 px-2 py-1 text-xs text-white" onClick={() => set('media', form.media.filter((_, i) => i !== index))}>ลบ</button></div>)}</div>
      </div>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditing(null)}>ยกเลิก</Button><Button onClick={save} disabled={pending || uploading}>{pending ? 'กำลังบันทึก…' : 'บันทึกเมนู'}</Button></div>
    </CardContent></Card>
  )

  return <div className="space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><Button variant="outline" onClick={() => setShowTrash((v) => !v)}>{showTrash ? 'กลับไปเมนูทั้งหมด' : 'ถังขยะ'}</Button><Button onClick={() => open()}><Plus className="size-4" />เพิ่มเมนูใหม่</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <Card key={item.id} className="overflow-hidden"><div className="aspect-video bg-gray-100">{item.coverImageUrl ? <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">ยังไม่มีรูป</div>}</div><CardContent className="space-y-3 pt-4"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{item.nameTh}</h3><p className="text-xs text-muted-foreground">{item.category} · ล่วงหน้า {item.leadDays} วัน</p></div><span className="text-sm font-medium">{item.price == null ? 'ยังไม่ตั้งราคา' : `฿${item.price.toLocaleString()}`}</span></div><div className="flex flex-wrap gap-2">{item.isDeleted ? <Button size="sm" onClick={() => startTransition(async () => { await setPreorderItemDeleted(item.id, false); toast.success('กู้คืนแล้ว') })}><RotateCcw className="size-4" />กู้คืน</Button> : <><Button size="sm" variant="outline" onClick={() => open(item)}><Pencil className="size-4" />แก้ไข</Button><Button size="sm" variant={item.status === 'active' ? 'secondary' : 'outline'} onClick={() => startTransition(async () => { const next = item.status === 'active' ? 'paused' : 'active'; const result = await setPreorderItemStatus(item.id, next); if (!result.ok) toast.error(result.error); else toast.success(next === 'active' ? 'เปิดขายแล้ว' : 'ปิดรับแล้ว') })}>{item.status === 'active' ? 'ปิดรับ' : 'เปิดขาย'}</Button><Button size="sm" variant="destructive" onClick={() => { if (confirm(`ลบ “${item.nameTh}” ไปที่ถังขยะ?`)) startTransition(async () => { await setPreorderItemDeleted(item.id, true); toast.success('ย้ายไปถังขยะแล้ว') }) }}><Trash2 className="size-4" /></Button></>}</div></CardContent></Card>)}</div>
  </div>
}
