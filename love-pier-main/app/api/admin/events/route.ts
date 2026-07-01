import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(events).orderBy(asc(events.sortOrder))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const [row] = await db.insert(events).values({
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
  }).returning()
  return NextResponse.json(row, { status: 201 })
}
