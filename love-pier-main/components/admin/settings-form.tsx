'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveSettings, type ShopSettingsForm } from '@/app/admin/actions/settings'

export function SettingsForm({ initial }: { initial: ShopSettingsForm }) {
  const [form, setForm] = useState<ShopSettingsForm>(initial)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof ShopSettingsForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function onSave() {
    startTransition(async () => {
      const res = await saveSettings(form)
      if (res.ok) toast.success('บันทึกการตั้งค่าแล้ว')
      else toast.error('บันทึกไม่สำเร็จ')
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label>วิธีคำนวณระยะจัดส่ง</Label>
        <Select value={form.distanceMethod} onValueChange={(v) => set('distanceMethod', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">เส้นตรง (ฟรี — ไม่ต้องใช้ API key)</SelectItem>
            <SelectItem value="google">ระยะขับจริง (Google — ต้องมี API key)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          แบบ Google แม่นกว่า (ระยะถนนจริง) แต่ต้องเปิด Routes API + billing ใน Google Cloud
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>พิกัดร้าน — Latitude</Label>
          <Input
            value={form.shopLat}
            onChange={(e) => set('shopLat', e.target.value)}
            placeholder="12.678901"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label>พิกัดร้าน — Longitude</Label>
          <Input
            value={form.shopLng}
            onChange={(e) => set('shopLng', e.target.value)}
            placeholder="100.987654"
            inputMode="decimal"
          />
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        เปิด Google Maps → คลิกขวาที่ร้าน → เลขชุดแรก = Latitude, ชุดสอง = Longitude
      </p>

      <div className="space-y-1.5">
        <Label>รัศมีจัดส่ง (กม.)</Label>
        <Input
          value={form.radiusKm}
          onChange={(e) => set('radiusKm', e.target.value)}
          placeholder="5"
          inputMode="decimal"
          className="w-32"
        />
      </div>

      {form.distanceMethod === 'google' && (
        <div className="space-y-1.5">
          <Label>Google Maps API Key</Label>
          <Input
            value={form.googleApiKey}
            onChange={(e) => set('googleApiKey', e.target.value)}
            placeholder="AIza..."
            type="password"
          />
          <p className="text-xs text-muted-foreground">
            Google Cloud Console → เปิด Routes API + billing → Credentials → Create API Key
          </p>
        </div>
      )}

      <div className="border-t pt-5 space-y-4">
        <div>
          <p className="font-medium text-sm">ค่าจัดส่ง</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ค่าจัดส่งคิดเป็นขั้นตามระยะทาง (ไม่ใช่สูตรค่าเริ่มต้น + อัตราต่อกม.แบบเดิม) — ระยะ 0-2 กม. คิดเท่ากับช่วง 2 กม.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>0–2 กม. (บาท)</Label>
            <Input
              value={form.deliveryFeeTier2km}
              onChange={(e) => set('deliveryFeeTier2km', e.target.value)}
              placeholder="20"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>2–3 กม. (บาท)</Label>
            <Input
              value={form.deliveryFeeTier3km}
              onChange={(e) => set('deliveryFeeTier3km', e.target.value)}
              placeholder="30"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>3–4 กม. (บาท)</Label>
            <Input
              value={form.deliveryFeeTier4km}
              onChange={(e) => set('deliveryFeeTier4km', e.target.value)}
              placeholder="40"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>4–5 กม. (บาท)</Label>
            <Input
              value={form.deliveryFeeTier5km}
              onChange={(e) => set('deliveryFeeTier5km', e.target.value)}
              placeholder="50"
              inputMode="decimal"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          ระยะเกิน 5 กม. อยู่นอกรัศมีจัดส่งอยู่แล้ว (ลูกค้าต้องเรียกไรเดอร์เอง) จึงไม่มีขั้นถัดไป
        </p>

        <div className="space-y-1.5">
          <Label>ยอดสั่งอาหารที่จัดส่งฟรี (บาท)</Label>
          <Input
            value={form.freeDeliveryThreshold}
            onChange={(e) => set('freeDeliveryThreshold', e.target.value)}
            placeholder="0"
            inputMode="decimal"
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            นับเฉพาะค่าอาหาร (ไม่รวมค่าจัดส่ง) — สั่งครบยอดนี้ในรัศมีจัดส่งฟรี ต่ำกว่านี้ลูกค้ายังเลือกให้ร้านจัดส่งได้ตามปกติ
            แค่เสียค่าจัดส่งตามระยะทางด้านบน เว้นว่าง (หรือ 0) = ไม่มีโปรจัดส่งฟรี
          </p>
        </div>
      </div>

      <div className="border-t pt-5 space-y-4">
        <div>
          <p className="font-medium text-sm">ตรวจสลิปอัตโนมัติ (SlipOK)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ลูกค้าแนบสลิป → ระบบเช็คกับธนาคารว่าจริง/ยอดตรง แล้วอัปเดตเป็น &ldquo;จ่ายแล้ว&rdquo;
            อัตโนมัติ · สมัคร + รับ API key ที่ slipok.com
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>SlipOK API Key</Label>
          <Input
            value={form.slipokApiKey}
            onChange={(e) => set('slipokApiKey', e.target.value)}
            placeholder="SLIPOK..."
            type="password"
          />
        </div>
        <div className="space-y-1.5">
          <Label>SlipOK Branch ID</Label>
          <Input
            value={form.slipokBranchId}
            onChange={(e) => set('slipokBranchId', e.target.value)}
            placeholder="เช่น 12345"
            className="w-40"
          />
          <p className="text-xs text-muted-foreground">เว้นว่างทั้งคู่ = ปิดระบบตรวจสลิป (ลูกค้าส่งสลิปทาง LINE เอง)</p>
        </div>
      </div>

      <Button onClick={onSave} disabled={pending}>
        {pending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
      </Button>
    </div>
  )
}
