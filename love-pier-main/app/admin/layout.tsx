import { eq, sql } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/admin/actions/auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login page renders without the shell.
  if (!user) return <>{children}</>

  // Count of unhandled (pending) orders for the sidebar badge.
  let pendingOrders = 0
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'pending'))
    pendingOrders = Number(row?.n ?? 0)
  } catch {
    pendingOrders = 0
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar email={user.email ?? ''} signOut={signOut} pendingOrders={pendingOrders} />
      <main className="flex-1 overflow-auto bg-gray-50 pt-12 md:pt-0">{children}</main>
    </div>
  )
}
