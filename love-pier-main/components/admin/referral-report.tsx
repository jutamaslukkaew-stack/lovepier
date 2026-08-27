'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { recordReferralPayout, type AgentRow } from '@/app/admin/actions/referrals'

// Working list for paying agents. Sorted by what is owed, because that is the
// order someone works through it in.

function baht(n: number) {
  return `฿${n.toLocaleString('th-TH')}`
}

function shortDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: '2-digit',
  })
}

function AgentCard({ agent }: { agent: AgentRow }) {
  const [open, setOpen] = useState(false)
  const [paying, setPaying] = useState(false)
  // Pre-filled with what is owed — the overwhelmingly common case is paying
  // exactly that, and a partial payment is still typeable.
  const [amount, setAmount] = useState(String(Math.max(0, agent.outstanding)))
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      const res = await recordReferralPayout({
        agentCustomerId: agent.customerId,
        amount: Number(amount),
        orderCount: agent.orderCount,
        note,
      })
      if (!res.ok) {
        toast.error(res.error ?? 'บันทึกไม่สำเร็จ')
        return
      }
      toast.success(`บันทึกการจ่าย ${baht(Number(amount))} แล้ว`)
      setPaying(false)
      setNote('')
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/customers/${agent.customerId}`} className="font-medium hover:underline">
              {agent.name || agent.phone || '—'}
            </Link>
            <Badge variant="secondary">ลูกทีม {agent.downlineCount} คน</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ออเดอร์ที่นับได้ {agent.orderCount} · สะสม {baht(agent.accrued)} · จ่ายแล้ว {baht(agent.paid)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">ค้างจ่าย</p>
          {/* A negative balance means the shop paid more than has accrued.
              Shown rather than clamped to zero — hiding an overpayment is how
              it gets paid a second time. */}
          <p className={`text-lg font-semibold tabular-nums ${agent.outstanding < 0 ? 'text-amber-600' : ''}`}>
            {baht(agent.outstanding)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
          {open ? 'ซ่อนลูกทีม' : `ดูลูกทีม ${agent.downlineCount} คน`}
        </Button>
        {/* Nothing to pay is not a state that needs a button. */}
        {agent.outstanding > 0 && (
          <Button size="sm" onClick={() => setPaying(!paying)} disabled={pending}>
            {paying ? 'ยกเลิก' : 'บันทึกการจ่าย'}
          </Button>
        )}
      </div>

      {paying && (
        <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">จำนวนเงินที่โอน (บาท)</span>
            <Input
              className="mt-1"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="text-xs text-muted-foreground">หมายเหตุ (เช่น เลขอ้างอิงการโอน)</span>
            <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button size="sm" onClick={save} disabled={pending || !(Number(amount) > 0)}>
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </Button>
          <p className="text-[11px] text-muted-foreground sm:col-span-3">
            บันทึกนี้เป็นการลงบัญชีว่าร้านโอนไปแล้วเท่าไร ระบบไม่ได้โอนเงินให้
          </p>
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {agent.downline.map((d) => (
            <div key={d.customerId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                <Link href={`/admin/customers/${d.customerId}`} className="hover:underline">
                  {d.name || d.phone || '—'}
                </Link>{' '}
                <span className="text-muted-foreground">
                  เข้าระบบ {shortDate(d.referredAt)} · นับถึง {shortDate(d.windowEndsAt)}
                </span>
              </span>
              <span className="tabular-nums">
                {/* A recruit who never ordered is worth showing at zero: it is
                    the difference between an agent who recruited nobody and
                    one whose recruits never came back. */}
                {d.orderCount} ออเดอร์ · {baht(d.fee)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReferralReport({ agents }: { agents: AgentRow[] }) {
  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        ยังไม่มีตัวแทนที่ชวนลูกค้าเข้ามา
        <br />
        สร้างลิงก์เชิญแล้วเลือก “ตัวแทนเจ้าของลิงก์” ที่หน้า ลิงก์เชิญ
      </div>
    )
  }
  const totalOutstanding = agents.reduce((s, a) => s + Math.max(0, a.outstanding), 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
        <span className="text-sm text-muted-foreground">ค้างจ่ายรวมทุกตัวแทน</span>
        <span className="text-lg font-semibold tabular-nums">{baht(totalOutstanding)}</span>
      </div>
      {agents.map((a) => (
        <AgentCard key={a.customerId} agent={a} />
      ))}
    </div>
  )
}
