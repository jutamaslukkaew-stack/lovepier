import Link from 'next/link'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories, menuItems } from '@/lib/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

async function getStats() {
  const [cat] = await db.select({ n: sql<number>`count(*)` }).from(categories)
  const [items] = await db
    .select({ n: sql<number>`count(*)` })
    .from(menuItems)
    .where(eq(menuItems.isDeleted, false))
  const [unavailable] = await db
    .select({ n: sql<number>`count(*)` })
    .from(menuItems)
    .where(and(eq(menuItems.isDeleted, false), eq(menuItems.isAvailable, false)))
  return {
    categories: Number(cat?.n ?? 0),
    items: Number(items?.n ?? 0),
    unavailable: Number(unavailable?.n ?? 0),
  }
}

export default async function AdminHome() {
  const stats = await getStats()
  const cards = [
    { label: 'หมวดเมนู', value: stats.categories },
    { label: 'เมนูทั้งหมด', value: stats.items },
    { label: 'เมนูที่ปิดขายอยู่', value: stats.unavailable },
  ]
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">ภาพรวม</h1>
        <Button asChild>
          <Link href="/admin/menu">จัดการเมนู</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
