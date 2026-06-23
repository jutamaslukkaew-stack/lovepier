'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
import type { MenuItem } from '@/lib/db/schema'
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  reorderMenuItems,
} from '@/app/admin/actions/menu-items'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MenuItemDialog, type CategoryOption } from './menu-item-dialog'

export function MenuManager({
  categories,
  initialItems,
}: {
  categories: CategoryOption[]
  initialItems: MenuItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<MenuItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const catName = (id: string) => categories.find((c) => c.id === id)?.nameTh ?? '—'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((i) => {
      if (categoryFilter !== 'all' && i.categoryId !== categoryFilter) return false
      if (!q) return true
      return [i.nameTh, i.nameEn, i.nameZh].some((n) => n.toLowerCase().includes(q))
    })
  }, [items, categoryFilter, query])

  const canReorder = categoryFilter !== 'all' && !query

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = filtered.map((i) => i.id)
    const next = arrayMove(filtered, ids.indexOf(active.id as string), ids.indexOf(over.id as string))
    // apply new order to the master list (only within this category)
    const reordered = items.map((i) => i)
    const positions = next.map((i) => i.id)
    reordered.sort((a, b) => {
      const ai = positions.indexOf(a.id)
      const bi = positions.indexOf(b.id)
      if (ai === -1 || bi === -1) return 0
      return ai - bi
    })
    setItems(reordered)
    startTransition(async () => {
      const res = await reorderMenuItems({ ids: positions })
      if (!res.ok) {
        toast.error(res.error)
        setItems(items)
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">เมนูอาหาร</h1>
        <Button onClick={() => setCreating(true)} disabled={categories.length === 0}>
          <Plus className="size-4" /> เพิ่มเมนู
        </Button>
      </div>

      {categories.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          ยังไม่มีหมวดเมนู — สร้างหมวดก่อนจึงจะเพิ่มเมนูได้
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวด</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nameTh}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="ค้นหาเมนู…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {!canReorder && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          เลือกหมวดเดียว (และล้างการค้นหา) เพื่อจัดลำดับด้วยการลาก
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          ไม่พบเมนู
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={filtered.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {filtered.map((item) => (
                <MenuRow
                  key={item.id}
                  item={item}
                  categoryName={catName(item.categoryId)}
                  draggable={canReorder}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleting(item)}
                  onToggle={(value) => {
                    setItems((prev) =>
                      prev.map((i) => (i.id === item.id ? { ...i, isAvailable: value } : i))
                    )
                    startTransition(async () => {
                      const res = await toggleAvailability(item.id, value)
                      if (!res.ok) {
                        toast.error(res.error)
                        router.refresh()
                      }
                    })
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <MenuItemDialog
        open={creating || !!editing}
        item={editing}
        categories={categories}
        defaultCategoryId={categoryFilter !== 'all' ? categoryFilter : undefined}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
        onSubmit={async (values) => {
          const res = editing
            ? await updateMenuItem(editing.id, values)
            : await createMenuItem(values)
          if (res.ok) {
            toast.success(editing ? 'แก้ไขเมนูแล้ว' : 'เพิ่มเมนูแล้ว')
            setCreating(false)
            setEditing(null)
            router.refresh()
          } else {
            toast.error(res.error)
          }
          return res.ok
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบเมนู “{deleting?.nameTh}”?</AlertDialogTitle>
            <AlertDialogDescription>
              เมนูจะถูกซ่อนจากเว็บ (soft delete) — กู้คืนได้จากฐานข้อมูลภายหลัง
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return
                const res = await deleteMenuItem(deleting.id)
                if (res.ok) {
                  toast.success('ลบเมนูแล้ว')
                  setItems((prev) => prev.filter((i) => i.id !== deleting.id))
                  setDeleting(null)
                } else {
                  toast.error(res.error)
                }
              }}
            >
              ลบเมนู
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function MenuRow({
  item,
  categoryName,
  draggable,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItem
  categoryName: string
  draggable: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: (value: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !draggable,
  })
  const priceLabel = item.priceMax
    ? `฿${item.price}–฿${item.priceMax}`
    : `฿${item.price}`

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg border bg-background p-3 ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      {draggable && (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          aria-label="ลากเพื่อจัดเรียง"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-5" />
        </button>
      )}
      <div className="size-14 shrink-0 overflow-hidden rounded-md border bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.imageAlt ?? item.nameTh}
            width={56}
            height={56}
            className="size-full object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.nameTh}</span>
          {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
          {item.isFeatured && <Badge>แนะนำ</Badge>}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {categoryName} · {priceLabel}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Switch
          checked={item.isAvailable}
          onCheckedChange={onToggle}
          aria-label="เปิด/ปิดการขาย"
        />
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
      </div>
    </li>
  )
}
