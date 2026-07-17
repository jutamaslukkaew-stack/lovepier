'use client'

import { useEffect, useState, useTransition } from 'react'
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
import { GripVertical, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Event } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { EventModal, type EventForm } from './EventModal'

function formatDate(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`
}

// Derived from the date, never stored/editable — mirrors the split used on
// the public /events page (effective end = endDate, falling back to eventDate).
function eventStatus(event: Event): 'upcoming' | 'past' | null {
  const effectiveEnd = (event as any).endDate || event.eventDate
  if (!effectiveEnd) return null
  const todayStr = new Date().toISOString().slice(0, 10)
  return effectiveEnd >= todayStr ? 'upcoming' : 'past'
}

function SortableRow({
  event,
  onEdit,
  onDelete,
  onToggle,
}: {
  event: Event
  onEdit: (e: Event) => void
  onDelete: (e: Event) => void
  onToggle: (e: Event) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: event.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground" aria-label="ลาก">
        <GripVertical className="size-4" />
      </button>

      {event.imageUrl ? (
        <Image src={event.imageUrl} alt={event.titleTh} width={48} height={48} className="size-12 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="size-12 shrink-0 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-[10px]">No img</div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{event.titleTh}</span>
          {event.isFeatured && <Star className="size-3 fill-amber-400 text-amber-400 shrink-0" />}
          {(() => {
            const status = eventStatus(event)
            if (!status) return null
            return (
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {status === 'upcoming' ? 'Upcoming' : 'Past'}
              </span>
            )
          })()}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {formatDate(event.eventDate)}{event.timeRange ? ` · ${event.timeRange}` : ''}{event.location ? ` · ${event.location}` : ''}
        </div>
        <div className="text-xs text-muted-foreground">
          {event.price != null ? `฿${event.price.toLocaleString()}` : 'ฟรี'}{event.categoryTh ? ` · ${event.categoryTh}` : ''}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Switch checked={event.isActive} onCheckedChange={() => onToggle(event)} aria-label="toggle" />
        <button onClick={() => onEdit(event)} className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground">
          <Pencil className="size-4" />
        </button>
        <button onClick={() => onDelete(event)} className="rounded p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default function EventsPage() {
  const [items, setItems] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Event | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [, startTransition] = useTransition()

  async function load() {
    const res = await fetch('/api/admin/events')
    if (res.ok) setItems(await res.json())
  }

  useEffect(() => { load() }, [])

  const filtered = items.filter((e) =>
    !search || e.titleTh.toLowerCase().includes(search.toLowerCase()) || e.titleEn.toLowerCase().includes(search.toLowerCase())
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function onDragEnd(ev: DragEndEvent) {
    const { active, over } = ev
    if (!over || active.id === over.id) return
    const ids = filtered.map((e) => e.id)
    const next = arrayMove(filtered, ids.indexOf(active.id as number), ids.indexOf(over.id as number))
    const positions = next.map((e) => e.id)
    const reordered = items.slice().sort((a, b) => {
      const ai = positions.indexOf(a.id)
      const bi = positions.indexOf(b.id)
      if (ai === -1 || bi === -1) return 0
      return ai - bi
    })
    setItems(reordered)
    startTransition(async () => {
      try {
        await Promise.all(
          positions.map((id, idx) =>
            fetch(`/api/admin/events/${id}`, {
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

  async function handleSave(data: EventForm) {
    const isNew = !editing
    const url = isNew ? '/api/admin/events' : `/api/admin/events/${editing!.id}`
    const method = isNew ? 'POST' : 'PUT'
    const body = { ...data, price: data.price !== '' ? Number(data.price) : null }
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      toast.success(isNew ? 'เพิ่มอีเวนต์แล้ว' : 'บันทึกแล้ว')
      setModalOpen(false)
      startTransition(() => { load() })
    } else {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  async function handleDelete(event: Event) {
    if (!window.confirm(`ลบ "${event.titleTh}" ?`)) return
    const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('ลบแล้ว')
      setItems((prev) => prev.filter((e) => e.id !== event.id))
    } else {
      toast.error('เกิดข้อผิดพลาด')
    }
  }

  async function handleToggle(event: Event) {
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...event, isActive: !event.isActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">อีเวนต์</h1>
          <p className="text-sm text-muted-foreground">{items.length} รายการ</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus className="size-4 mr-1" /> เพิ่มอีเวนต์
        </Button>
      </div>

      <Input
        placeholder="ค้นหา..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีอีเวนต์ — กด "เพิ่มอีเวนต์" เพื่อเริ่มต้น'}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={filtered.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filtered.map((event) => (
                <SortableRow
                  key={event.id}
                  event={event}
                  onEdit={(e) => { setEditing(e); setModalOpen(true) }}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {modalOpen && (
        <EventModal
          event={editing}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
