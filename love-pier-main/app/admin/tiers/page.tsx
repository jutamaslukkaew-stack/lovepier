import { listTiers } from '@/app/admin/actions/tiers'
import { getShopSettings } from '@/lib/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TierManager } from '@/components/admin/tier-manager'

export const dynamic = 'force-dynamic'

// Customer groups (phase 1 of the 2026-08-26 member-group plan). Adding a
// group used to mean editing lib/tiers.js and deploying; it is now this page.
export default async function AdminTiersPage() {
  const [result, settings] = await Promise.all([listTiers(), getShopSettings()])

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">กลุ่มลูกค้า</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างกลุ่มและตั้งส่วนลดได้เอง ไม่ต้องแก้โค้ด · ส่วนลดคิดจากค่าอาหารเท่านั้น ไม่ลดค่าส่ง
        </p>
      </div>

      {/* The single most confusing thing about this screen: the numbers below
          do nothing at all while the master switch is off, and it ships off.
          Say it at the top rather than letting someone set 50% and wonder why
          nobody is charged it. */}
      {!settings.memberDiscountEnabled && (
        <Card className="border-amber-500/50 bg-amber-50">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-amber-900">ส่วนลดสมาชิกปิดอยู่</p>
            <p className="mt-1 text-amber-800">
              ตอนนี้ทุกกลุ่มคิดส่วนลด 0% ไม่ว่าตั้งไว้เท่าไร · เปิดสวิตช์ได้ที่หน้า ตั้งค่า
            </p>
          </CardContent>
        </Card>
      )}

      {result.ok ? (
        <Card>
          <CardHeader><CardTitle className="text-base">กลุ่มทั้งหมด</CardTitle></CardHeader>
          <CardContent>
            <TierManager initial={result.tiers} />
          </CardContent>
        </Card>
      ) : (
        /* The table is not there yet. Everything else in the app still works —
           lib/tierCatalog.js falls back to the four built-in groups — so this
           is an instruction, not an outage. */
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base">ยังไม่ได้ติดตั้งตารางกลุ่มลูกค้า</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ระบบยังใช้ 4 กลุ่มเดิมได้ตามปกติ ราคาไม่มีอะไรเปลี่ยน แต่จะยังเพิ่มกลุ่มใหม่ไม่ได้จนกว่าจะรันคำสั่งนี้
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
              npm run db:migrate-tier-catalog
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
