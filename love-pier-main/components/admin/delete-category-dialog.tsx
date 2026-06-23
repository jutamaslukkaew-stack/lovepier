'use client'

import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { CategoryRow } from './categories-manager'

export function DeleteCategoryDialog({
  category,
  others,
  onOpenChange,
  onConfirm,
}: {
  category: CategoryRow | null
  others: CategoryRow[]
  onOpenChange: (open: boolean) => void
  onConfirm: (moveToCategoryId?: string) => Promise<void>
}) {
  const [moveTo, setMoveTo] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const hasItems = (category?.itemCount ?? 0) > 0

  useEffect(() => {
    setMoveTo('')
  }, [category])

  return (
    <AlertDialog open={!!category} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ลบหมวด “{category?.nameTh}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasItems
              ? `หมวดนี้มี ${category?.itemCount} เมนู — เลือกหมวดที่จะย้ายเมนูไปก่อนลบ`
              : 'การลบนี้ย้อนกลับไม่ได้'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasItems && (
          <div className="grid gap-2">
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger>
                <SelectValue placeholder="ย้ายเมนูไปหมวด…" />
              </SelectTrigger>
              <SelectContent>
                {others.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nameTh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {others.length === 0 && (
              <p className="text-sm text-destructive">
                ต้องมีอย่างน้อยอีก 1 หมวดเพื่อย้ายเมนูก่อนลบ
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            disabled={busy || (hasItems && !moveTo)}
            onClick={async () => {
              setBusy(true)
              await onConfirm(hasItems ? moveTo : undefined)
              setBusy(false)
            }}
          >
            {busy ? 'กำลังลบ…' : 'ลบหมวด'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
