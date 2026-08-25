'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setCustomerTier } from '@/app/admin/actions/customers'
import { TIERS, tierLabel } from '@/lib/tiers'

// Which discount group this customer belongs to (2026-08-24 journey review).
// Staff-only on purpose: the 50% and 100% tiers are real money and the
// document requires affiliated-staff status to be verified by a person, so
// this control exists here and nowhere the customer can reach.
export function CustomerTierSelect({ id, tier, expiresAt }: { id: string; tier: string; expiresAt: string | null }) {
  const [pending, startTransition] = useTransition()
  const [selectedTier, setSelectedTier] = useState(tier)
  const [expiry, setExpiry] = useState(expiresAt ?? '')
  const router = useRouter()

  function update() {
    startTransition(async () => {
      const res = await setCustomerTier(id, selectedTier, selectedTier === 'general' ? null : expiry || null)
      if (!res.ok) {
        toast.error(res.error ?? 'เปลี่ยนกลุ่มไม่สำเร็จ')
        return
      }
      toast.success(`บันทึกกลุ่ม "${tierLabel(selectedTier)}" แล้ว`)
      router.refresh()
    })
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">กลุ่มส่วนลด</p>
      <Select value={selectedTier} onValueChange={setSelectedTier} disabled={pending}>
        <SelectTrigger className="mt-1 h-8 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIERS.map((t) => (
            <SelectItem key={t.key} value={t.key} className="text-sm">
              {t.labelTh} · {t.defaultPercent}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTier !== 'general' && (
        <div className="mt-2">
          <label className="text-xs text-muted-foreground" htmlFor={`tier-expiry-${id}`}>วันหมดอายุ (เว้นว่าง = ไม่มีวันหมดอายุ)</label>
          <input id={`tier-expiry-${id}`} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
        </div>
      )}
      <button type="button" onClick={update} disabled={pending} className="mt-2 h-9 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {pending ? 'กำลังบันทึก…' : 'บันทึกกลุ่มและอายุสิทธิ์'}
      </button>
      {/* The rate shown in the list is each tier's default. The live number is
          whatever /admin/settings holds, and the whole thing is inert until
          the discount switch there is on — say so, rather than letting this
          look like it takes effect on its own. */}
      <p className="mt-1 text-[11px] text-muted-foreground">
        อัตราจริงตั้งที่ /admin/settings และต้องเปิดสวิตช์ส่วนลดก่อนจึงจะมีผล · ออเดอร์เก่าไม่เปลี่ยน
      </p>
    </div>
  )
}
