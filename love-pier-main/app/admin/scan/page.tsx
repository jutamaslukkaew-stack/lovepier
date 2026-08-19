import { ScanTerminal } from '@/components/admin/scan-terminal'

export const dynamic = 'force-dynamic'

export default function AdminScanPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">สแกนสมาชิก</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สแกน QR จากบัตร Love Pier ID ของลูกค้า แล้วกรอกยอดเต็มเพื่อคิดส่วนลดและบันทึกแต้ม
        </p>
      </div>
      <ScanTerminal />
    </div>
  )
}
