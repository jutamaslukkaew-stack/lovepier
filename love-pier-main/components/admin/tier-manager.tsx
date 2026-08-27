'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  createTier,
  deleteTier,
  setTierActive,
  updateTier,
  type TierRow,
} from '@/app/admin/actions/tiers'

// Editing customer groups. Every row here is a live price for somebody, so
// the UI leans on being explicit rather than compact: the key is shown and
// locked, the member count is always visible, and retiring is offered before
// deleting.

const BLANK = { key: '', labelTh: '', labelEn: '', discountPercent: 0, staffOnly: true, sortOrder: 100 }

export function TierManager({ initial }: { initial: TierRow[] }) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({})
  const [creating, setCreating] = useState(false)
  const [newTier, setNewTier] = useState({ ...BLANK })
  const router = useRouter()

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string, done?: () => void) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        toast.error(res.error ?? 'บันทึกไม่สำเร็จ')
        return
      }
      toast.success(success)
      done?.()
      router.refresh()
    })
  }

  function startEdit(t: TierRow) {
    setEditing(t.key)
    setDraft({
      labelTh: t.labelTh,
      labelEn: t.labelEn,
      discountPercent: t.discountPercent,
      staffOnly: t.staffOnly,
      sortOrder: t.sortOrder,
    })
  }

  return (
    <div className="space-y-3">
      {initial.map((t) => {
        const isEditing = editing === t.key
        return (
          <div
            key={t.key}
            className={`rounded-lg border p-4 ${t.isActive ? '' : 'bg-muted/40 opacity-75'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.labelTh}</span>
                  {/* The key is what customers.tier actually stores and what a
                      future invite URL will carry — show it, it is the thing
                      an admin needs when reading a log or a report. */}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t.key}</code>
                  {!t.isActive && <Badge variant="outline">เลิกใช้แล้ว</Badge>}
                  {t.staffOnly && <Badge variant="secondary">แอดมินตั้งให้เท่านั้น</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  ส่วนลด {t.discountPercent}% · ลูกค้า {t.customerCount.toLocaleString()} คน
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => (isEditing ? setEditing(null) : startEdit(t))}>
                  {isEditing ? 'ยกเลิก' : 'แก้ไข'}
                </Button>
                {t.key !== 'general' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => setTierActive(t.key, !t.isActive),
                        t.isActive ? 'ปิดการใช้งานกลุ่มแล้ว' : 'เปิดใช้งานกลุ่มแล้ว'
                      )
                    }
                  >
                    {t.isActive ? 'ปิดการใช้งาน' : 'เปิดใช้งาน'}
                  </Button>
                )}
                {/* Only offered when nobody is in the group. The action
                    re-checks server-side; this just avoids showing a button
                    that always fails. */}
                {t.key !== 'general' && t.customerCount === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => run(() => deleteTier(t.key), 'ลบกลุ่มแล้ว')}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs text-muted-foreground">ชื่อกลุ่ม (ไทย)</span>
                  <Input
                    className="mt-1"
                    value={String(draft.labelTh ?? '')}
                    onChange={(e) => setDraft({ ...draft, labelTh: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-muted-foreground">ชื่อกลุ่ม (อังกฤษ)</span>
                  <Input
                    className="mt-1"
                    value={String(draft.labelEn ?? '')}
                    onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-muted-foreground">ส่วนลด (%)</span>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    max={100}
                    value={String(draft.discountPercent ?? 0)}
                    onChange={(e) => setDraft({ ...draft, discountPercent: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-muted-foreground">ลำดับการแสดง</span>
                  <Input
                    className="mt-1"
                    type="number"
                    value={String(draft.sortOrder ?? 100)}
                    onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
                  />
                </label>
                {/* 'general' is the fallback for every unknown and expired
                    tier, so it can never require an admin to assign it. */}
                {t.key !== 'general' && (
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch
                      checked={Boolean(draft.staffOnly)}
                      onCheckedChange={(v) => setDraft({ ...draft, staffOnly: v })}
                    />
                    <span className="text-sm">ต้องให้แอดมินตั้งให้เท่านั้น (ลูกค้าเข้าเองไม่ได้)</span>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          updateTier(t.key, {
                            labelTh: String(draft.labelTh ?? ''),
                            labelEn: String(draft.labelEn ?? ''),
                            discountPercent: Number(draft.discountPercent),
                            staffOnly: Boolean(draft.staffOnly),
                            sortOrder: Number(draft.sortOrder),
                          }),
                        'บันทึกกลุ่มแล้ว',
                        () => setEditing(null)
                      )
                    }
                  >
                    {pending ? 'กำลังบันทึก…' : 'บันทึก'}
                  </Button>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    เปลี่ยนส่วนลดมีผลกับออเดอร์ใหม่เท่านั้น · ออเดอร์เก่าเก็บเปอร์เซ็นต์ที่คิดไว้ตอนสั่ง
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {creating ? (
        <div className="rounded-lg border border-dashed p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">รหัสกลุ่ม (a–z, 0–9, _)</span>
              <Input
                className="mt-1 font-mono"
                placeholder="agent"
                value={newTier.key}
                onChange={(e) => setNewTier({ ...newTier, key: e.target.value })}
              />
              {/* Said before they type it, not after the update fails. */}
              <span className="mt-1 block text-[11px] text-muted-foreground">
                ตั้งแล้วเปลี่ยนไม่ได้ เพราะลูกค้าจะถือรหัสนี้ไว้
              </span>
            </label>
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">ชื่อกลุ่ม (ไทย)</span>
              <Input
                className="mt-1"
                placeholder="ตัวแทน"
                value={newTier.labelTh}
                onChange={(e) => setNewTier({ ...newTier, labelTh: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">ชื่อกลุ่ม (อังกฤษ)</span>
              <Input
                className="mt-1"
                placeholder="Agent"
                value={newTier.labelEn}
                onChange={(e) => setNewTier({ ...newTier, labelEn: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">ส่วนลด (%)</span>
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={100}
                value={String(newTier.discountPercent)}
                onChange={(e) => setNewTier({ ...newTier, discountPercent: Number(e.target.value) })}
              />
            </label>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={newTier.staffOnly}
                onCheckedChange={(v) => setNewTier({ ...newTier, staffOnly: v })}
              />
              <span className="text-sm">ต้องให้แอดมินตั้งให้เท่านั้น (ลูกค้าเข้าเองไม่ได้)</span>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => createTier(newTier), 'สร้างกลุ่มแล้ว', () => {
                    setCreating(false)
                    setNewTier({ ...BLANK })
                  })
                }
              >
                {pending ? 'กำลังสร้าง…' : 'สร้างกลุ่ม'}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setCreating(false)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)} disabled={pending}>
          + เพิ่มกลุ่มใหม่
        </Button>
      )}
    </div>
  )
}
