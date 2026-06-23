import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/admin/actions/auth'
import { Button } from '@/components/ui/button'
import { AdminNav } from '@/components/admin/admin-nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Login page renders without the shell.
  if (!user) return <>{children}</>

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Love Pier <span className="text-muted-foreground">Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button variant="outline" size="sm" type="submit">
                ออกจากระบบ
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
