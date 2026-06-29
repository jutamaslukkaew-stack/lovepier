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

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const [row] = await db
    .update(promotions)
    .set({
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
    .where(eq(promotions.id, Number(id)))
    .returning()
  return NextResponse.json(row)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await db.delete(promotions).where(eq(promotions.id, Number(id)))
  return new NextResponse(null, { status: 204 })
}
