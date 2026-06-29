'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
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
import type { Promotion } from '@/lib/db/schema'
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
import { PromotionModal } from './PromotionModal'

function SortableRow({
  promo,
  canReorder,
  onEdit,
  onDelete,
  onToggle,
}: {
  promo: Promotion
  canReorder: boolean
  onEdit: (p: Promotion) => void
  onDelete: (p: Promotion) => void
  onToggle: (p: Promotion) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: promo.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3"
    >
      {canReorder && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="ลาก"
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {promo.imageUrl ? (
        <Image
          src={promo.imageUrl}
          alt={promo.titleTh}
          width={48}
          height={48}
          className="size-12 shrink-0 rounded-md object-cover"
          unoptimized
        />
      ) : (
        <div className="size-12 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium truncate">{promo.titleTh}</span>
          {promo.category && (
            <Badge variant="secondary" className="text-xs">{promo.category}</Badge>
          )}
          {promo.discountLabel && (
            <Badge variant="destructive" className="text-xs">{promo.discountLabel}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {promo.category && <span>{promo.category} · </span>}
          ฿{promo.priceCurrent.toLocaleString()}
          {promo.priceOriginal && (
            <span className="line-through ml-1 text-xs">฿{promo.priceOriginal.toLocaleString()}</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Switch
          checked={promo.isActive}
          onCheckedChange={() => onToggle(promo)}
          aria-label="เปิด/ปิด"
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(promo)}>
          <Pencil className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(promo)}>
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promotions')
      if (!res.ok) throw new Error('โหลดไม่สำเร็จ')
      setPromos(await res.json())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const categories = useMemo(() => {
    const set = new Set(promos.map((p) => p.category).filter(Boolean))
    return Array.from(set)
  }, [promos])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return promos.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (!q) return true
      return [p.titleTh, p.titleEn, p.titleZh].some((t) => t.toLowerCase().includes(q))
    })
  }, [promos, categoryFilter, search])

  const canReorder = true

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const ids = filtered.map((p) => p.id)
    const next = arrayMove(filtered, ids.indexOf(active.id as number), ids.indexOf(over.id as number))
    const positions = next.map((p) => p.id)
    const reordered = promos.slice().sort((a, b) => {
      const ai = positions.indexOf(a.id)
      const bi = positions.indexOf(b.id)
      if (ai === -1 || bi === -1) return 0
      return ai - bi
    })
    setPromos(reordered)
    startTransition(async () => {
      try {
        await Promise.all(
          positions.map((id, idx) =>
            fetch(`/api/admin/promotions/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sortOrder: idx }),
            })
          )
        )
      } catch {
        toast.error('จัดลำดับไม่สำเร็จ')
        load()
      }
    })
  }

  async function handleDelete(p: Promotion) {
    if (!window.confirm(`ลบ "${p.titleTh}" ?`)) return
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      toast.success('ลบแล้ว')
      setPromos((prev) => prev.filter((x) => x.id !== p.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
    }
  }

  async function handleToggle(p: Promotion) {
    try {
      const res = await fetch(`/api/admin/promotions/${p.id}/toggle`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      const updated: Promotion = await res.json()
      setPromos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch {
      toast.error('เปลี่ยนสถานะไม่สำเร็จ')
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">โปรโมชัน</h1>
        <Button
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          <Plus className="size-4" /> เพิ่มโปรโมชัน
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวด</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="ค้นหาโปรโมชัน…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>


      {loading ? (
        <p className="text-muted-foreground text-sm">กำลังโหลด…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          ยังไม่มีโปรโมชัน
        </div>
      ) : canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filtered.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filtered.map((p) => (
                <SortableRow
                  key={p.id}
                  promo={p}
                  canReorder
                  onEdit={(x) => { setEditing(x); setModalOpen(true) }}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <SortableRow
              key={p.id}
              promo={p}
              canReorder={false}
              onEdit={(x) => { setEditing(x); setModalOpen(true) }}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      <PromotionModal
        open={modalOpen}
        promotion={editing}
        onOpenChange={setModalOpen}
        onSaved={load}
      />
    </div>
  )
}
