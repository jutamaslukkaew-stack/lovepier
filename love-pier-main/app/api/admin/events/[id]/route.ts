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
  const [row] = await db.update(events).set({
    titleTh: body.titleTh,
    titleEn: body.titleEn,
    titleZh: body.titleZh ?? '',
    titleEm: body.titleEm ?? '',
    eventDate: body.eventDate ?? null,
    timeRange: body.timeRange ?? '',
    timeSub: body.timeSub ?? '',
    location: body.location ?? '',
    price: body.price != null ? Number(body.price) : null,
    entrySubTh: body.entrySubTh ?? '',
    entrySubEn: body.entrySubEn ?? '',
    entrySubZh: body.entrySubZh ?? '',
    descriptionTh: body.descriptionTh ?? '',
    descriptionEn: body.descriptionEn ?? '',
    descriptionZh: body.descriptionZh ?? '',
    categoryTh: body.categoryTh ?? '',
    categoryEn: body.categoryEn ?? '',
    categoryZh: body.categoryZh ?? '',
    imageUrl: body.imageUrl ?? null,
    albumImages: body.albumImages ?? [],
    isFeatured: body.isFeatured ?? false,
    isActive: body.isActive ?? true,
    sortOrder: body.sortOrder ?? 0,
  }).where(eq(events.id, Number(id))).returning()
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(events).where(eq(events.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}
