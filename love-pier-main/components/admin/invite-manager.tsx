'use client'

import { useEffect, useState, useTransition } from 'react'
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
import {
  createInvite,
  deleteInvite,
  setInviteActive,
  type InviteRow,
} from '@/app/admin/actions/invites'
import { shareableInviteUrl, webInviteUrl } from '@/lib/invites'

// Minting and managing invite links. The QR and the copyable URL are the
// actual product here — everything else is bookkeeping around them.

type TierOption = { key: string; labelTh: string; percent: number }
/** Candidates for "this link belongs to an agent" (0017). */
export type AgentOption = { id: string; name: string; phone: string }

// Same source as lib/orderFlex.js, and deliberately NOT window.location.origin:
// an admin working on localhost would otherwise generate a QR pointing at
// localhost, print it, and discover the problem from a customer.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lovepier.cafe'
// The /join LIFF app. Without it the only link we can offer is the plain web
// URL, which does NOT work inside LINE — see the banner below.
const JOIN_LIFF_ID = process.env.NEXT_PUBLIC_JOIN_LIFF_ID || ''

const STATUS_LABEL: Record<InviteRow['status'], string> = {
  ok: 'ใช้งานได้',
  inactive: 'ปิดอยู่',
  expired: 'หมดอายุ',
  exhausted: 'ใช้ครบแล้ว',
}

function InviteQr({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Dynamic import, same technique as the member card and the PromptPay
        // QR: the qrcode bundle is never pulled in for admins who never open
        // a QR.
        const QRCode = (await import('qrcode')).default
        const png = await QRCode.toDataURL(url, { margin: 1, width: 320 })
        if (!cancelled) setDataUrl(png)
      } catch {
        // The link text above it is still copyable.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url])

  if (!dataUrl) return <p className="text-xs text-muted-foreground">กำลังสร้าง QR…</p>
  // eslint-disable-next-line @next/next/no-img-element -- a data: URL, not an asset the image optimiser can process
  return <img src={dataUrl} alt="QR ลิงก์เชิญ" className="h-48 w-48 rounded-md border bg-white" />
}

export function InviteManager({
  initial,
  tiers,
  customers,
}: {
  initial: InviteRow[]
  tiers: TierOption[]
  customers: AgentOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)
  const [showQr, setShowQr] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    tierKey: tiers[0]?.key ?? '',
    label: '',
    maxUses: '',
    expiresAt: '',
    tierExpiresAt: '',
    ownerCustomerId: '',
  })
  const [agentQuery, setAgentQuery] = useState('')
  const agentMatches = agentQuery.trim()
    ? customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(agentQuery.trim().toLowerCase()) ||
            c.phone.includes(agentQuery.trim())
        )
        .slice(0, 6)
    : []
  const pickedAgent = customers.find((c) => c.id === draft.ownerCustomerId) || null
  const router = useRouter()

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string, done?: () => void) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok) {
        toast.error(res.error ?? 'ทำรายการไม่สำเร็จ')
        return
      }
      toast.success(success)
      done?.()
      router.refresh()
    })
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('คัดลอกลิงก์แล้ว')
    } catch {
      // Clipboard is blocked outside a secure context or without permission.
      // Say so rather than showing a success toast for something that did not
      // happen — the admin can still select the visible link text.
      toast.error('คัดลอกอัตโนมัติไม่ได้ กรุณาคัดลอกลิงก์ด้วยตนเอง')
    }
  }

  return (
    <div className="space-y-3">
      {/* The single most likely way to waste an afternoon here: printing QR
          codes that cannot work in the app they are meant to be scanned in. */}
      {!JOIN_LIFF_ID && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-sm">
          <p className="font-medium text-amber-900">ลิงก์ยังใช้ใน LINE ไม่ได้</p>
          <p className="mt-1 text-amber-800">
            ยังไม่ได้ตั้งค่า LIFF app ของหน้า /join ลิงก์ข้างล่างจึงเป็น URL เว็บธรรมดา
            ซึ่งเปิดในแอป LINE แล้วจะเข้าสู่ระบบไม่ได้ — ใช้ทดสอบในเบราว์เซอร์คอมพิวเตอร์ได้เท่านั้น
            อย่าเพิ่งพิมพ์ QR แจก
          </p>
        </div>
      )}
      {initial.length === 0 && !creating && (
        <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีลิงก์เชิญ</p>
      )}

      {initial.map((inv) => {
        // What to send a customer: the liff.line.me form when the LIFF app
        // exists, the site URL otherwise.
        const url = shareableInviteUrl({ liffId: JOIN_LIFF_ID, origin: SITE_URL, code: inv.code })
        return (
          <div key={inv.id} className={`rounded-lg border p-4 ${inv.status === 'ok' ? '' : 'bg-muted/40'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold tracking-wider">
                    {inv.code}
                  </code>
                  <Badge variant={inv.status === 'ok' ? 'default' : 'outline'}>
                    {STATUS_LABEL[inv.status]}
                  </Badge>
                  <span className="text-sm">→ {inv.tierLabelTh}</span>
                </div>
                {inv.label && <p className="mt-1 text-sm text-muted-foreground">{inv.label}</p>}
                {inv.ownerCustomerId && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">ตัวแทน:</span> {inv.ownerName || '—'}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  ใช้แล้ว {inv.useCount}
                  {inv.maxUses == null ? ' ครั้ง (ไม่จำกัด)' : ` / ${inv.maxUses} ครั้ง`}
                  {inv.expiresAt && ` · ลิงก์หมดอายุ ${inv.expiresAt.slice(0, 10)}`}
                  {inv.tierExpiresAt && ` · สิทธิ์ถึง ${inv.tierExpiresAt}`}
                </p>
                <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">{url}</p>
                {JOIN_LIFF_ID && (
                  <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground/70">
                    ทดสอบบนคอม: {webInviteUrl(SITE_URL, inv.code)}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(url)}>คัดลอกลิงก์</Button>
                <Button size="sm" variant="outline" onClick={() => setShowQr(showQr === inv.id ? null : inv.id)}>
                  {showQr === inv.id ? 'ซ่อน QR' : 'QR'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => setInviteActive(inv.id, !inv.isActive),
                      inv.isActive ? 'ปิดลิงก์แล้ว' : 'เปิดลิงก์แล้ว'
                    )
                  }
                >
                  {inv.isActive ? 'ปิด' : 'เปิด'}
                </Button>
                {/* Offered only for an unused link; deleteInvite re-checks. */}
                {inv.useCount === 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={pending}
                    onClick={() => run(() => deleteInvite(inv.id), 'ลบลิงก์แล้ว')}
                  >
                    ลบ
                  </Button>
                )}
              </div>
            </div>
            {showQr === inv.id && (
              <div className="mt-4 flex flex-col items-center gap-2 border-t pt-4">
                <InviteQr url={url} />
                <p className="text-xs text-muted-foreground">กดค้างที่ภาพเพื่อบันทึก แล้วส่งใน LINE ได้เลย</p>
              </div>
            )}
          </div>
        )
      })}

      {creating ? (
        <div className="rounded-lg border border-dashed p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">กลุ่มปลายทาง</span>
              <Select value={draft.tierKey} onValueChange={(v) => setDraft({ ...draft, tierKey: v })}>
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
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">ชื่อเรียกภายใน (ไม่แสดงให้ลูกค้าเห็น)</span>
              <Input
                className="mt-1"
                placeholder="คอนโด A รอบ ส.ค."
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </label>
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">ใช้ได้กี่คน (เว้นว่าง = ไม่จำกัด)</span>
              <Input
                className="mt-1"
                type="number"
                min={1}
                placeholder="50"
                value={draft.maxUses}
                onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })}
              />
              {/* The distinction that confuses people, said where they choose. */}
              <span className="mt-1 block text-[11px] text-muted-foreground">
                ลิงก์ที่ถูกส่งต่อในกลุ่มแชทจะถูกใช้เกินที่ตั้งใจได้ ใส่จำนวนไว้จะปลอดภัยกว่า
              </span>
            </label>
            <label className="text-sm">
              <span className="text-xs text-muted-foreground">วันที่ลิงก์หมดอายุ (เว้นว่าง = ไม่หมด)</span>
              <Input
                className="mt-1"
                type="date"
                value={draft.expiresAt}
                onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
              />
            </label>
            <div className="text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">ตัวแทนเจ้าของลิงก์ (ไม่บังคับ)</span>
              {pickedAgent ? (
                <div className="mt-1 flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{pickedAgent.name || '—'}</span>{' '}
                    <span className="text-muted-foreground">{pickedAgent.phone}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraft({ ...draft, ownerCustomerId: '' })
                      setAgentQuery('')
                    }}
                  >
                    เอาออก
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    className="mt-1"
                    placeholder="ค้นหาชื่อหรือเบอร์โทรของตัวแทน"
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                  />
                  {agentMatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDraft({ ...draft, ownerCustomerId: c.id })}
                      className="mt-1 flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium">{c.name || '—'}</span>{' '}
                        <span className="text-muted-foreground">{c.phone}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
              {/* Said at the point of choosing: an ordinary campaign link
                  without an owner earns nobody anything, and that is fine. */}
              <span className="mt-1 block text-[11px] text-muted-foreground">
                ใส่เมื่อเป็นลิงก์ของตัวแทน เพื่อให้ระบบนับค่าแนะนำให้ · ลิงก์ทั่วไปเว้นว่างไว้
              </span>
            </div>
            <label className="text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">สิทธิ์ของลูกค้าหมดอายุวันที่ (เว้นว่าง = ไม่หมด)</span>
              <Input
                className="mt-1"
                type="date"
                value={draft.tierExpiresAt}
                onChange={(e) => setDraft({ ...draft, tierExpiresAt: e.target.value })}
              />
              <span className="mt-1 block text-[11px] text-muted-foreground">
                คนละอย่างกับวันหมดอายุลิงก์ — อันนี้คือส่วนลดของลูกค้าที่เข้ามาแล้วจะอยู่ถึงเมื่อไร
              </span>
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <Button
                size="sm"
                disabled={pending || !draft.tierKey}
                onClick={() =>
                  run(
                    () =>
                      createInvite({
                        tierKey: draft.tierKey,
                        label: draft.label,
                        maxUses: draft.maxUses === '' ? null : Number(draft.maxUses),
                        // A date input gives '2026-09-01'; the link should work
                        // through that whole day, so expire it at the end.
                        expiresAt: draft.expiresAt ? `${draft.expiresAt}T23:59:59+07:00` : null,
                        tierExpiresAt: draft.tierExpiresAt || null,
                        ownerCustomerId: draft.ownerCustomerId || null,
                      }),
                    'สร้างลิงก์แล้ว',
                    () => {
                      setCreating(false)
                      setAgentQuery('')
                      setDraft({ tierKey: tiers[0]?.key ?? '', label: '', maxUses: '', expiresAt: '', tierExpiresAt: '', ownerCustomerId: '' })
                    }
                  )
                }
              >
                {pending ? 'กำลังสร้าง…' : 'สร้างลิงก์'}
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setCreating(false)}>
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setCreating(true)} disabled={pending || tiers.length === 0}>
          + สร้างลิงก์เชิญ
        </Button>
      )}
    </div>
  )
}
