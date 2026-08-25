import { and, asc, eq, isNotNull } from 'drizzle-orm'
import { db } from './index'
import { preorderItems } from './schema'

export async function getActivePreorderItems() {
  return db.select().from(preorderItems).where(and(
    eq(preorderItems.status, 'active'),
    eq(preorderItems.isDeleted, false),
    isNotNull(preorderItems.price)
  )).orderBy(asc(preorderItems.sortOrder))
}
