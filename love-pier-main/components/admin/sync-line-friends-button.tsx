'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { syncLineOaFriends } from '@/app/admin/actions/customers'

export function SyncLineFriendsButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => {
      const result = await syncLineOaFriends()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`ซิงก์เพื่อน LINE OA แล้ว ${result.synced} คน`)
    })}>
      <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} />
      {pending ? 'กำลังซิงก์…' : 'ซิงก์เพื่อน LINE OA'}
    </Button>
  )
}
