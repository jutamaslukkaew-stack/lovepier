import { listPreorderItems } from '@/app/admin/actions/preorder-items'
import { PreorderMenuManager } from '@/components/admin/preorder-menu-manager'

export const dynamic = 'force-dynamic'

export default async function AdminPreorderMenuPage() {
  const items = await listPreorderItems(true)
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-6"><div><h1 className="text-2xl font-semibold">เมนู Pre Order</h1><p className="mt-1 text-sm text-muted-foreground">เพิ่มรูป วิดีโอ ราคา ระยะเวลาเตรียม และเปิดขายเมนูที่พร้อมแล้ว</p></div><PreorderMenuManager items={items} /></div>
}
