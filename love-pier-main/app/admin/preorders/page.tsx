import { AdminOrdersContent } from '@/app/admin/orders/page'

export const dynamic = 'force-dynamic'

export default async function AdminPreordersPage() {
  return <AdminOrdersContent preordersOnly />
}
