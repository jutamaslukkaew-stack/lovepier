import { asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { categories } from '@/lib/db/schema'
import { listMenuItems } from '@/app/admin/actions/menu-items'
import { MenuManager } from '@/components/admin/menu-manager'

export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const [cats, items] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    listMenuItems(),
  ])
  return (
    <MenuManager
      categories={cats.map((c) => ({ id: c.id, nameTh: c.nameTh }))}
      initialItems={items}
    />
  )
}
