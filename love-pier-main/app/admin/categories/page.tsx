import { listCategories } from '@/app/admin/actions/categories'
import { CategoriesManager } from '@/components/admin/categories-manager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const categories = await listCategories()
  return <CategoriesManager initial={categories} />
}
