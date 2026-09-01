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
import { setOrderStatus } from '@/app/admin/actions/orders'
import { ORDER_STATUSES, STATUS_LABELS } from '@/app/admin/orders/status'

// Mirrors NOTICE_LINE_TH in pages/api/line-webhook.js — staff get the same
// answer whether they changed the status here or from a LINE button. `warning`
// is reserved for the two outcomes that need a human to follow up; the rest
// are `info` because there was simply nothing to send.
const NOTICE_TOAST: Record<string, { level: 'success' | 'info' | 'warning'; text: string }> = {
  sent: { level: 'success', text: 'และแจ้งลูกค้าทาง LINE แล้ว' },
  'no-line': { level: 'info', text: '— ออเดอร์นี้ไม่มีบัญชี LINE' },
  'in-store': { level: 'info', text: '— ออเดอร์หน้าร้าน ไม่ต้องแจ้งลูกค้า' },
  'no-card': { level: 'info', text: '— สถานะนี้ไม่มีการ์ดแจ้งลูกค้า' },
  blocked: { level: 'warning', text: '— ลูกค้าบล็อก LINE ของร้านอยู่ รบกวนโทรแจ้ง' },
  failed: { level: 'warning', text: '— แต่ส่ง LINE ให้ลูกค้าไม่สำเร็จ' },
}

export function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function updateStatus(next: string) {
    startTransition(async () => {
      const res = await setOrderStatus(id, next)
      if (!res.ok) {
        toast.error(res.error ?? 'อัปเดตไม่สำเร็จ')
      } else if (res.unchanged) {
        toast.info('สถานะนี้ถูกเลือกอยู่แล้ว')
      } else {
        const notice = NOTICE_TOAST[res.customerNotice ?? ''] ?? NOTICE_TOAST.failed
        toast[notice.level](`อัปเดตเป็น "${STATUS_LABELS[next] ?? next}" ${notice.text}`)
      }
      if (res.ok && !res.unchanged) router.refresh()
    })
  }

  const quickAction = status === 'pending'
    ? { next: 'paid', label: 'ยืนยันชำระเงิน · แจ้ง LINE' }
    : status === 'paid'
    ? { next: 'preparing', label: 'รับออเดอร์ · แจ้ง LINE' }
    : status === 'preparing'
      ? { next: 'done', label: 'ออเดอร์พร้อม · แจ้ง LINE' }
      : null

  return (
    <div className="flex flex-col items-end gap-2">
      <Select value={status} onValueChange={updateStatus} disabled={pending}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              {STATUS_LABELS[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {quickAction && (
        <button
          type="button"
          disabled={pending}
          onClick={() => updateStatus(quickAction.next)}
          className="rounded-md bg-[#3a2818] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#4a3520] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'กำลังส่ง...' : quickAction.label}
        </button>
      )}
    </div>
  )
}
