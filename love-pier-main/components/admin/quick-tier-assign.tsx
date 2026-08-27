'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setCustomerTier } from '@/app/admin/actions/customers'
import type { TierCatalogEntry } from '@/lib/inStore'

// ผัง 1's left-hand path, made short: "แอดมินเปิดรายชื่อลูกค้า → เลือกคน แล้ว
// เลือกกลุ่ม". Setting someone's group previously meant finding them in the
// table, opening their detail page, and scrolling to the picker. This does it
// from the list, which is where an admin already is when they decide to.
//
// It writes through the SAME server action as the detail page, so every rule
// (valid group, valid date, history row) is enforced identically — this is a
// shortcut through the UI, not a second way in.

export type QuickCustomer = {
  id: string
  name: string
  phone: string
  tier: string
  tierLabelTh: string
}

export function QuickTierAssign({
  customers,
  tiers,
}: {
  customers: QuickCustomer[]
  tiers: TierCatalogEntry[]
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<QuickCustomer | null>(null)
  const [tierKey, setTierKey] = useState('')
  const [expiry, setExpiry] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      // Capped: this is a picker, not a report. A query that matches 150
      // people means the admin should type more, and rendering all of them
      // buries the one they want.
      .slice(0, 8)
  }, [customers, query])

  function reset() {
    setOpen(false)
    setQuery('')
    setPicked(null)
    setTierKey('')
    setExpiry('')
  }

  function save() {
    if (!picked || !tierKey) return
    startTransition(async () => {
      const res = await setCustomerTier(picked.id, tierKey, tierKey === 'general' ? null : expiry || null)
      if (!res.ok) {
        toast.error(res.error ?? 'เปลี่ยนกลุ่มไม่สำเร็จ')
        return
      }
      const label = tiers.find((t) => t.key === tierKey)?.labelTh ?? tierKey
      toast.success(`ย้าย ${picked.name || picked.phone} เข้ากลุ่ม "${label}" แล้ว`)
      reset()
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + เพิ่มลูกค้าพิเศษ
      </Button>
    )
  }

  return (
    <div className="w-full rounded-lg border border-dashed p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">เพิ่มลูกค้าเข้ากลุ่มพิเศษ</p>
        <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>ปิด</Button>
      </div>

      {!picked ? (
        <div className="mt-3 space-y-2">
          <Input
            autoFocus
            placeholder="ค้นหาจากชื่อหรือเบอร์โทร"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query.trim() && matches.length === 0 && (
            <p className="text-sm text-muted-foreground">ไม่พบลูกค้าที่ตรงกับคำค้น</p>
          )}
          {matches.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setPicked(c)
                setTierKey(c.tier)
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="min-w-0 truncate">
                <span className="font-medium">{c.name || '—'}</span>{' '}
                <span className="text-muted-foreground">{c.phone}</span>
              </span>
              {c.tier !== 'general' && <Badge className="bg-amber-600 shrink-0">{c.tierLabelTh}</Badge>}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium">{picked.name || '—'}</span>{' '}
              <span className="text-muted-foreground">{picked.phone}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)} disabled={pending}>
              เปลี่ยนคน
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">กลุ่ม</span>
              <Select value={tierKey} onValueChange={setTierKey} disabled={pending}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="เลือกกลุ่ม" /></SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.labelTh} · {t.percent}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {/* The general group is everybody's default and has no expiry —
                offering a date there would imply it can lapse into something. */}
            {tierKey !== 'general' && (
              <label className="text-sm">
                <span className="text-xs text-muted-foreground">วันหมดอายุสิทธิ์ (เว้นว่าง = ไม่หมด)</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  disabled={pending}
                />
              </label>
            )}
          </div>
          <Button size="sm" onClick={save} disabled={pending || !tierKey}>
            {pending ? 'กำลังบันทึก…' : 'บันทึกกลุ่ม'}
          </Button>
        </div>
      )}
    </div>
  )
}
