import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/admin/actions/auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login page renders without the shell.
  if (!user) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar email={user.email ?? ''} signOut={signOut} />
      <main className="flex-1 overflow-auto bg-gray-50 pt-12 md:pt-0">{children}</main>
    </div>
  )
}
