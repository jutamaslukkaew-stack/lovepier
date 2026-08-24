'use client'

import { useTransition } from 'react'
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
export function CustomerTierSelect({ id, tier }: { id: string; tier: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function update(next: string) {
    if (next === tier) return
    startTransition(async () => {
      const res = await setCustomerTier(id, next)
      if (!res.ok) {
        toast.error(res.error ?? 'เปลี่ยนกลุ่มไม่สำเร็จ')
        return
      }
      toast.success(`ย้ายไปกลุ่ม "${tierLabel(next)}" แล้ว`)
      router.refresh()
    })
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">กลุ่มส่วนลด</p>
      <Select value={tier} onValueChange={update} disabled={pending}>
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
