'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Clock } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { updateOrderSchedule } from '@/app/admin/actions/orders'
import { NOTICE_TOAST } from '@/components/admin/order-status-select'
// Pure and import-free (see the header of lib/preorder.js), so a client
// component may use it. This is also the ONLY correct way to read the stored
// instant back into Bangkok wall-clock fields — a plain getHours() here would
// show the admin their own device's timezone.
import { bangkokDateParts, formatSlotThai, weekdayOfYmd } from '@/lib/preorder'

/**
 * Staff-side pickup-time editor for a pre-order.
 *
 * Native <input type="date"> / <input type="time"> on purpose. The customer's
 * picker deliberately rejects them (see the comment in
 * components/delivery/OrderFlow.js) because min/max cannot express "not
 * Wednesdays" and a customer must only be offered times the shop will honour.
 * That reasoning does not apply here: staff are overriding the rules, not
 * choosing from an offer, so free entry is the point. The warnings below make
 * an unusual choice deliberate rather than impossible.
 */
export function OrderScheduleEdit({
  id,
  scheduledFor,
  closedDays = [3],
}: {
  id: string
  scheduledFor: Date | string
  closedDays?: number[]
}) {
  const current = bangkokDateParts(scheduledFor)
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(current?.ymd ?? '')
  const [time, setTime] = useState(current?.hhmm ?? '')
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!current) return null

  const changed = date !== current.ymd || time !== current.hhmm
  // Warnings, never blocks: staff reschedule precisely because the ordering
  // rules no longer describe the situation. See lib/orderScheduleUpdate.js.
  const onClosedDay = Boolean(date) && closedDays.includes(weekdayOfYmd(date) ?? -1)
  const inPast = Boolean(date && time) && new Date(`${date}T${time}:00+07:00`).getTime() < Date.now()

  function save() {
    startTransition(async () => {
      const res = await updateOrderSchedule(id, { scheduledDate: date, scheduledSlot: time, reason, notify })
      if (!res.ok) {
        toast.error(res.error ?? 'แก้เวลาไม่สำเร็จ')
        return
      }
      if (res.unchanged) {
        toast.info('เวลานี้ถูกตั้งไว้อยู่แล้ว')
        return
      }
      if (notify) {
        const notice = NOTICE_TOAST[res.customerNotice ?? ''] ?? NOTICE_TOAST.failed
        toast[notice.level](`เปลี่ยนเวลารับเป็น "${res.to}" ${notice.text}`)
      } else {
        toast.success(`เปลี่ยนเวลารับเป็น "${res.to}" — ไม่ได้แจ้งลูกค้า`)
      }
      setOpen(false)
      setReason('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-muted"
      >
        <Clock className="size-3" />
        แก้เวลา
      </button>
    )
  }

  return (
    <div className="mt-2 w-full space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        />
        <span className="text-xs text-muted-foreground">
          เดิม {formatSlotThai(current.ymd, current.hhmm)}
        </span>
      </div>

      {onClosedDay && <p className="text-xs text-amber-600">วันที่เลือกเป็นวันที่ร้านปิด — ยืนยันอีกครั้งว่าตั้งใจ</p>}
      {inPast && <p className="text-xs text-amber-600">เวลาที่เลือกผ่านไปแล้ว — ยืนยันอีกครั้งว่าตั้งใจ</p>}

      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        placeholder="เหตุผล เช่น ของเสร็จช้ากว่ากำหนด (จะแสดงในการ์ด LINE ของลูกค้า)"
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      />

      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-muted-foreground">แจ้งลูกค้าทาง LINE</label>
        <Switch checked={notify} onCheckedChange={setNotify} />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setDate(current.ymd)
            setTime(current.hhmm)
            setReason('')
          }}
          className="rounded-md border px-3 py-1.5 text-xs"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={pending || !changed || !date || !time}
          onClick={save}
          className="rounded-md bg-[#3a2818] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#4a3520] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก...' : 'บันทึกเวลาใหม่'}
        </button>
      </div>
    </div>
  )
}
