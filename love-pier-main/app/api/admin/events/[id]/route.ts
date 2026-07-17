import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Partial update: only touch a column when the caller actually sent it.
  // (The drag-reorder call only sends { sortOrder }, e.g. — falling back to
  // defaults for the rest here would blast every other column, including
  // albumImages, back to empty on every reorder.)
  const updates: Partial<typeof events.$inferInsert> = {}
  const set = <K extends keyof typeof updates>(key: K, value: (typeof updates)[K]) => {
    if (key in body) updates[key] = value
  }
  set('titleTh', body.titleTh)
  set('titleEn', body.titleEn)
  set('titleZh', body.titleZh ?? '')
  set('titleEm', body.titleEm ?? '')
  set('eventDate', body.eventDate ?? null)
  set('endDate', body.endDate ?? null)
  set('timeRange', body.timeRange ?? '')
  set('timeSub', body.timeSub ?? '')
  set('location', body.location ?? '')
  set('organizer', body.organizer ?? '')
  set('price', body.price != null ? Number(body.price) : null)
  set('entrySubTh', body.entrySubTh ?? '')
  set('entrySubEn', body.entrySubEn ?? '')
  set('entrySubZh', body.entrySubZh ?? '')
  set('registrationInfoTh', body.registrationInfoTh ?? '')
  set('registrationInfoEn', body.registrationInfoEn ?? '')
  set('registrationInfoZh', body.registrationInfoZh ?? '')
  set('descriptionTh', body.descriptionTh ?? '')
  set('descriptionEn', body.descriptionEn ?? '')
  set('descriptionZh', body.descriptionZh ?? '')
  set('categoryTh', body.categoryTh ?? '')
  set('categoryEn', body.categoryEn ?? '')
  set('categoryZh', body.categoryZh ?? '')
  set('imageUrl', body.imageUrl ?? null)
  // Defense-in-depth: cap at 10 even if the admin client is bypassed.
  set('albumImages', Array.isArray(body.albumImages) ? body.albumImages.slice(0, 10) : [])
  set('isFeatured', body.isFeatured ?? false)
  set('isActive', body.isActive ?? true)
  set('sortOrder', body.sortOrder ?? 0)

  const [row] = await db.update(events).set(updates).where(eq(events.id, Number(id))).returning()
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(events).where(eq(events.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}
