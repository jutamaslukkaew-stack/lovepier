import { listInvites, listSelfServiceTiers } from '@/app/admin/actions/invites'
import { getShopSettings } from '@/lib/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteManager } from '@/components/admin/invite-manager'

export const dynamic = 'force-dynamic'

// Invite links (phase 2). ผัง 1's right-hand path: the admin mints a link,
// sends it into LINE, and the customer puts themselves in the group.
export default async function AdminInvitesPage() {
  const [result, tiers, settings] = await Promise.all([
    listInvites(),
    listSelfServiceTiers(),
    getShopSettings(),
  ])

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">ลิงก์เชิญเข้ากลุ่ม</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างลิงก์หรือ QR ส่งให้ลูกค้าทาง LINE · ลูกค้ากดแล้วเข้ากลุ่มเอง ไม่ต้องรอแอดมิน
        </p>
      </div>

      {!settings.memberDiscountEnabled && (
        <Card className="border-amber-500/50 bg-amber-50">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-amber-900">ส่วนลดสมาชิกปิดอยู่</p>
            <p className="mt-1 text-amber-800">
              ลิงก์ยังใช้เข้ากลุ่มได้ แต่ลูกค้าจะยังไม่ได้ส่วนลดจนกว่าจะเปิดสวิตช์ในหน้า ตั้งค่า
            </p>
          </CardContent>
        </Card>
      )}

      {/* Only groups that may be joined without an admin appear in the form.
          A shop wondering where scc/staff went needs to be told why, not left
          to conclude the page is broken. */}
      {tiers.length === 0 && (
        <Card className="border-amber-500/50 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            ยังไม่มีกลุ่มที่ลูกค้าเข้าเองได้ · กลุ่มที่ตั้งเป็น “แอดมินตั้งให้เท่านั้น” สร้างลิงก์เชิญไม่ได้
            ปรับได้ที่หน้า กลุ่มลูกค้า
          </CardContent>
        </Card>
      )}

      {result.ok ? (
        <Card>
          <CardHeader><CardTitle className="text-base">ลิงก์ทั้งหมด</CardTitle></CardHeader>
          <CardContent>
            <InviteManager initial={result.invites} tiers={tiers} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base">ยังไม่ได้ติดตั้งตารางลิงก์เชิญ</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ส่วนอื่นของระบบทำงานปกติ · รันคำสั่งนี้เพื่อเปิดใช้ลิงก์เชิญ
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
              npm run db:migrate-group-invites
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
