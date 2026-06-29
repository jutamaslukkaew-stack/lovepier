'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/app/admin/actions/categories'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CategoryDialog } from '@/components/admin/category-dialog'
import { DeleteCategoryDialog } from '@/components/admin/delete-category-dialog'

export type CategoryRow = {
  id: string
  nameTh: string
  nameEn: string
  nameZh: string
  slug: string
  sortOrder: number
  isActive: boolean
  itemCount: number
}

export function CategoriesManager({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<CategoryRow | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    const next = arrayMove(rows, oldIndex, newIndex)
    setRows(next)
    startTransition(async () => {
      const res = await reorderCategories({ ids: next.map((r) => r.id) })
      if (!res.ok) {
        toast.error(res.error)
        setRows(rows)
      }
    })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">หมวดเมนู</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" /> เพิ่มหมวด
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          ยังไม่มีหมวดเมนู — กด “เพิ่มหมวด” เพื่อเริ่ม
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {rows.map((row) => (
                <CategoryItem
                  key={row.id}
                  row={row}
                  onEdit={() => setEditing(row)}
                  onDelete={() => setDeleting(row)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <CategoryDialog
        open={creating || !!editing}
        category={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSubmit={async (values) => {
          const res = editing
            ? await updateCategory(editing.id, values)
            : await createCategory(values)
          if (res.ok) {
            toast.success(editing ? 'แก้ไขหมวดแล้ว' : 'เพิ่มหมวดแล้ว')
            setCreating(false)
            setEditing(null)
            router.refresh()
          } else {
            toast.error(res.error)
          }
          return res.ok
        }}
      />

      <DeleteCategoryDialog
        category={deleting}
        others={rows.filter((r) => r.id !== deleting?.id)}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={async (moveTo) => {
          if (!deleting) return
          const res = await deleteCategory(deleting.id, moveTo)
          if (res.ok) {
            toast.success('ลบหมวดแล้ว')
            setDeleting(null)
            router.refresh()
          } else {
            toast.error(res.error)
          }
        }}
      />
    </div>
  )
}

function CategoryItem({
  row,
  onEdit,
  onDelete,
}: {
  row: CategoryRow
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-background p-3 ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label="ลากเพื่อจัดเรียง"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{row.nameTh}</span>
          {!row.isActive && <Badge variant="secondary">ซ่อน</Badge>}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {row.nameEn} · {row.nameZh} · {row.itemCount} เมนู
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="แก้ไข">
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        aria-label="ลบ"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  )
}
