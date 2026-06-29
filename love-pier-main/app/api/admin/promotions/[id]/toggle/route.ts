import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { promotions } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const [current] = await db
    .select({ isActive: promotions.isActive })
    .from(promotions)
    .where(eq(promotions.id, Number(id)))
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [row] = await db
    .update(promotions)
    .set({ isActive: !current.isActive })
    .where(eq(promotions.id, Number(id)))
    .returning()
  return NextResponse.json(row)
}
