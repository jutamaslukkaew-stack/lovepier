import { and, eq, gte, notInArray, sql } from 'drizzle-orm'
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
  let upcomingPreorders = 0
  try {
    const [pendingRow, preorderRow] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.status, 'pending')),
      db
        .select({ n: sql<number>`count(*)` })
        .from(orders)
        .where(and(
          gte(orders.scheduledFor, new Date()),
          notInArray(orders.status, ['done', 'cancelled'])
        )),
    ])
    pendingOrders = Number(pendingRow[0]?.n ?? 0)
    upcomingPreorders = Number(preorderRow[0]?.n ?? 0)
  } catch {
    pendingOrders = 0
    upcomingPreorders = 0
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar
        email={user.email ?? ''}
        signOut={signOut}
        pendingOrders={pendingOrders}
        upcomingPreorders={upcomingPreorders}
      />
      <main className="flex-1 overflow-auto bg-gray-50 pt-12 md:pt-0">{children}</main>
    </div>
  )
}
