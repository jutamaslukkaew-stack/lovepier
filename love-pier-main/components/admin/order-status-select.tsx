'use client'

import { useTransition } from 'react'
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

export function OrderStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  function onChange(next: string) {
    startTransition(async () => {
      const res = await setOrderStatus(id, next)
      if (res.ok) toast.success(`อัปเดตเป็น "${STATUS_LABELS[next] ?? next}"`)
      else toast.error(res.error ?? 'อัปเดตไม่สำเร็จ')
    })
  }

  return (
    <Select value={status} onValueChange={onChange} disabled={pending}>
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
  )
}
