import { createClient } from '@/lib/supabase/server'

/** Throws if there is no authenticated admin session. Use inside server actions. */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('UNAUTHENTICATED')
  }
  return user
}
