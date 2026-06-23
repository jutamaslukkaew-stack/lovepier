import { createClient } from '@supabase/supabase-js'

/**
 * Privileged service-role client — SERVER ONLY.
 * Used for storage cleanup and other admin tasks that bypass RLS.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_MENU_BUCKET ?? 'menu-images'

/** Best-effort removal of a stored image given its public URL. */
export async function removeImageByUrl(publicUrl: string | null | undefined) {
  if (!publicUrl) return
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length))
  if (!path) return
  try {
    await createAdminClient().storage.from(BUCKET).remove([path])
  } catch {
    // best effort — don't fail the parent action if cleanup fails
  }
}
