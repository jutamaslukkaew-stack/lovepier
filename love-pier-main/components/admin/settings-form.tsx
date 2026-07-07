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

      <Button onClick={onSave} disabled={pending}>
        {pending ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
      </Button>
    </div>
  )
}
