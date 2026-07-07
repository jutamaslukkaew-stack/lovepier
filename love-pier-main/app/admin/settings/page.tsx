import { getSettings } from '@/app/admin/actions/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SettingsForm } from '@/components/admin/settings-form'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const initial = await getSettings()

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">ตั้งค่า</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ระยะจัดส่ง</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm initial={initial} />
        </CardContent>
      </Card>
    </div>
  )
}
