'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { saveSettings, type ShopSettingsForm } from '@/app/admin/actions/settings'

// Password-style input with a show/hide toggle. Plain type="password" fields
// can't be copied out on iOS Safari (no context-menu Copy, no dev tools), so
// admins had no way to read back a key they'd already saved — this toggle is
// the fix.
function RevealInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        className="pr-9"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'ซ่อนรหัส' : 'แสดงรหัส'}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export function SettingsForm({ initial }: { initial: ShopSettingsForm }) {
  const [form, setForm] = useState<ShopSettingsForm>(initial)
  const [pending, startTransition] = useTransition()

  function set<K extends keyof ShopSettingsForm>(k: K, v: ShopSettingsForm[K]) {
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

      <div className="space-y-1.5">
        <Label>ยอดสั่งซื้อขั้นต่ำ (บาท)</Label>
        <Input
          value={form.minOrder}
          onChange={(e) => set('minOrder', e.target.value)}
          placeholder="300"
          inputMode="decimal"
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          ต่ำกว่านี้ลูกค้าสั่งซื้อไม่ได้เลย ไม่ว่าจะเลือกจัดส่งหรือรับเองที่ร้าน — เว้นว่างหรือใส่ 0 เพื่อไม่กำหนดขั้นต่ำ
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>อัตราสะสมแต้ม (บาทต่อ 1 แต้ม)</Label>
        <Input
          value={form.pointsPerBaht}
          onChange={(e) => set('pointsPerBaht', e.target.value)}
          placeholder="20"
          inputMode="decimal"
          className="w-32"
        />
        <p className="text-xs text-muted-foreground">
          ค่าแนะนำ 20 บาท = 1 แต้ม (ครบ 100 บาทได้ 5 แต้ม) และ 1 แต้มใช้ลดออเดอร์ถัดไปได้ 1 บาท
        </p>
      </div>

      <div className="border-t pt-5 space-y-4">
        <div>
          <p className="font-medium text-sm">สมาชิกหน้าร้าน (Love Pier ID)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ใช้เฉพาะตอนพนักงานสแกน QR สมาชิกที่หน้าร้าน (/admin/scan) — แยกจากอัตราเดลิเวอรี่ด้านบน
            แก้ค่าตรงนี้ไม่กระทบออเดอร์ออนไลน์
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>ส่วนลดสมาชิก (%)</Label>
            <Input
              value={form.inStoreDiscountPercent}
              onChange={(e) => set('inStoreDiscountPercent', e.target.value)}
              placeholder="10"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label>สะสมแต้ม (บาทต่อ 1 แต้ม)</Label>
            <Input
              value={form.inStorePointsPerBaht}
              onChange={(e) => set('inStorePointsPerBaht', e.target.value)}
              placeholder="1"
              inputMode="decimal"
            />
          </div>
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">
          ค่าเริ่มต้น: ลด 10% แล้วได้แต้มเท่ายอดที่จ่ายจริง (1 บาท = 1 แต้ม) เช่น ยอดเต็ม 700 บาท
          → ลดเหลือ 630 บาท → ได้ 630 แต้ม ใส่ 0 ในช่องส่วนลดเพื่อปิดส่วนลด
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border px-3.5 py-3">
        <div className="space-y-0.5">
          <Label>ตัวเลือกความหวาน/สายพันธุ์กาแฟต่อรายการ</Label>
          <p className="text-xs text-muted-foreground">
            แสดงให้ลูกค้าเลือกความหวานและสายพันธุ์กาแฟต่อรายการในตะกร้าตอนสรุปออเดอร์
          </p>
        </div>
        <Switch checked={form.menuOptionsEnabled} onCheckedChange={(v) => set('menuOptionsEnabled', v)} />
      </div>

      {form.distanceMethod === 'google' && (
        <div className="space-y-1.5">
          <Label>Google Maps API Key</Label>
          <RevealInput
            value={form.googleApiKey}
            onChange={(v) => set('googleApiKey', v)}
            placeholder="AIza..."
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
          ระยะเกิน 5 กม. อยู่นอกรัศมีจัดส่งอยู่แล้ว (ลูกค้าต้องเรียกไรเดอร์เอง) จึงไม่มีขั้นถัดไป — ยอดขั้นต่ำสำหรับจัดส่งตั้งแยกไว้ด้านบน
        </p>
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
          <RevealInput
            value={form.slipokApiKey}
            onChange={(v) => set('slipokApiKey', v)}
            placeholder="SLIPOK..."
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
