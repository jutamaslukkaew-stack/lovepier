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
import type { TierCatalogEntry } from '@/lib/inStore'

// Which discount group this customer belongs to (2026-08-24 journey review).
// Staff-only on purpose: the 50% and 100% tiers are real money and the
// document requires affiliated-staff status to be verified by a person, so
// this control exists here and nowhere the customer can reach.
//
// `tiers` is a PROP, not an import (0015). The list is a database table now,
// and this is a client component — it cannot read it. The page passes the
// active groups plus, if the customer is in a retired one, that group too, so
// the select can render its current value instead of showing blank.
export function CustomerTierSelect({
  id,
  tier,
  expiresAt,
  tiers,
}: {
  id: string
  tier: string
  expiresAt: string | null
  tiers: TierCatalogEntry[]
}) {
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
      const label = tiers.find((t) => t.key === selectedTier)?.labelTh ?? selectedTier
      toast.success(`บันทึกกลุ่ม "${label}" แล้ว`)
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
          {tiers.map((t) => (
            <SelectItem key={t.key} value={t.key} className="text-sm">
              {t.labelTh} · {t.percent}%
              {t.isActive === false ? ' (เลิกใช้แล้ว)' : ''}
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
      {/* The rate shown in the list is the group's live rate from the catalog,
          not a default — but the whole thing is still inert until the master
          discount switch in /admin/settings is on. Say so, rather than letting
          this look like it takes effect on its own. */}
      <p className="mt-1 text-[11px] text-muted-foreground">
        อัตราตั้งที่ /admin/tiers และต้องเปิดสวิตช์ส่วนลดใน /admin/settings ก่อนจึงจะมีผล · ออเดอร์เก่าไม่เปลี่ยน
      </p>
    </div>
  )
}
