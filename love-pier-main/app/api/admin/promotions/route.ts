import { NextResponse } from 'next/server'
import { asc } from 'drizzle-orm'
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

export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.select().from(promotions).orderBy(asc(promotions.sortOrder))
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const [row] = await db
    .insert(promotions)
    .values({
      titleTh: body.titleTh,
      titleEn: body.titleEn,
      titleZh: body.titleZh ?? '',
      descriptionTh: body.descriptionTh ?? '',
      descriptionEn: body.descriptionEn ?? '',
      descriptionZh: body.descriptionZh ?? '',
      category: body.category ?? '',
      imageUrl: body.imageUrl ?? null,
      priceCurrent: Number(body.priceCurrent),
      priceOriginal: body.priceOriginal ? Number(body.priceOriginal) : null,
      discountLabel: body.discountLabel ?? null,
      tags: body.tags ?? [],
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
      validFrom: body.validFrom ?? null,
      validUntil: body.validUntil ?? null,
    })
    .returning()
  return NextResponse.json(row, { status: 201 })
}
