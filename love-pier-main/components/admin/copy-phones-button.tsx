'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// The concrete, buildable half of "keep a list so we can target repeat
// customers later" — copies every phone number on the page (newline-
// separated) to the clipboard, ready to paste into whatever the shop ends up
// broadcasting through (LINE OA doesn't target by phone, so this is meant
// for SMS tools / ad-audience uploads / manual outreach).
export function CopyPhonesButton({ phones }: { phones: string[] }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(phones.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API unavailable — nothing else we can do here
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy} disabled={phones.length === 0}>
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? 'คัดลอกแล้ว' : `คัดลอกเบอร์ทั้งหมด (${phones.length})`}
    </Button>
  )
}
