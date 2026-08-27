import { getReferralReport } from '@/app/admin/actions/referrals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReferralReport } from '@/components/admin/referral-report'

export const dynamic = 'force-dynamic'

// Referral fees owed to agents (phase 3, ผัง 3). The shop transfers the money
// itself; this page exists so the figure is checkable and so what has already
// been paid is remembered.
export default async function AdminReferralsPage() {
  const report = await getReferralReport()

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">ค่าแนะนำตัวแทน</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          รวมยอดจากออเดอร์ที่ชำระเงินแล้วของลูกค้าที่ตัวแทนชวนเข้ามา ·{' '}
          <strong>ระบบไม่โอนเงินให้</strong> ร้านโอนเองแล้วมากดบันทึกว่าจ่ายแล้ว
        </p>
      </div>

      {!report.ok && 'disabled' in report && (
        <Card className="border-amber-500/50 bg-amber-50">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-amber-900">ระบบค่าแนะนำปิดอยู่</p>
            <p className="mt-1 text-amber-800">
              เปิดสวิตช์ “ค่าแนะนำสำหรับตัวแทน” ในหน้า ตั้งค่า ก่อน ระบบจึงจะเริ่มบันทึกว่าใครชวนใคร
              · ข้อมูลเดิมไม่ถูกลบ เปิดกลับมาก็นับต่อได้
            </p>
          </CardContent>
        </Card>
      )}

      {!report.ok && 'needsMigration' in report && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base">ยังไม่ได้ติดตั้งตารางค่าแนะนำ</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">ส่วนอื่นของระบบทำงานปกติ · รันคำสั่งนี้เพื่อเปิดใช้</p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
              npm run db:migrate-referrals
            </pre>
          </CardContent>
        </Card>
      )}

      {report.ok && (
        <>
          <p className="text-sm text-muted-foreground">
            อัตราปัจจุบัน <strong>{report.percent}%</strong> ของค่าอาหารหลังหักส่วนลด (ไม่รวมค่าส่ง)
            เป็นเวลา <strong>{report.months} เดือน</strong> นับจากวันที่ลูกค้าเข้าระบบ · แก้ได้ที่หน้า ตั้งค่า
          </p>
          <ReferralReport agents={report.agents} />
        </>
      )}
    </div>
  )
}
