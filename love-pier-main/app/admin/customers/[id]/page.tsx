import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCustomerDetail } from '@/app/admin/actions/customers'
import { DELIVERY_METHOD_LABELS, STATUS_LABELS, STATUS_VARIANT } from '@/app/admin/orders/status'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomerTierSelect } from '@/components/admin/customer-tier-select'
import { tierLabel } from '@/lib/tiers'

export const dynamic = 'force-dynamic'

function dateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function dateOnly(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'long', year: 'numeric',
  })
}

function memberNo(value: number | null) {
  return value == null ? 'ยังไม่ได้สมัคร' : `LP${String(value).padStart(3, '0')}`
}

function orderItems(items: unknown) {
  if (!Array.isArray(items)) return '—'
  return items.map((item: Record<string, unknown>) => `${String(item.name ?? 'รายการ')} × ${Number(item.qty) || 0}`).join(', ')
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <Card><CardContent className="px-5 py-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>{note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}</CardContent></Card>
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getCustomerDetail(id)
  if (!customer) notFound()

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <Link href={customer.memberNo == null ? '/admin/customers' : '/admin/members'} className="text-sm text-muted-foreground hover:underline">← กลับไปรายชื่อลูกค้า</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{customer.name || customer.lineDisplayName || 'ไม่ระบุชื่อ'}</h1>
              {customer.memberNo != null ? <Badge>{memberNo(customer.memberNo)}</Badge> : <Badge variant="outline">ลูกค้าทั่วไป</Badge>}
              {/* Only when it says something: every customer is 'general', so
                  a badge on all of them would be noise on the one screen
                  where a 50% or 100% rate needs to be obvious. */}
              {customer.tier !== 'general' && <Badge className="bg-amber-600">{tierLabel(customer.tier)}</Badge>}
              {customer.lineLinked && <Badge variant="secondary">เชื่อม LINE แล้ว</Badge>}
            </div>
            {customer.lineDisplayName && customer.lineDisplayName !== customer.name && <p className="mt-1 text-sm text-muted-foreground">LINE: {customer.lineDisplayName}</p>}
          </div>
          <div className="text-right text-sm text-muted-foreground"><p>เริ่มเก็บข้อมูล {dateOnly(customer.createdAt)}</p><p>อัปเดตล่าสุด {dateTime(customer.updatedAt)}</p></div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="ยอดซื้อสะสม" value={`฿${customer.totalSpend.toLocaleString()}`} note={`เฉลี่ย ฿${customer.averageSpend.toLocaleString()} / ออเดอร์`} />
        <Metric label="จำนวนออเดอร์" value={customer.orderCount.toLocaleString()} note={`ล่าสุด ${dateOnly(customer.lastOrderAt)}`} />
        <Metric label="คะแนนคงเหลือ" value={customer.pointsBalance.toLocaleString()} note={`ได้รับสะสม ${customer.pointsEarnedTotal.toLocaleString()} คะแนน`} />
        <Metric label="ใช้คะแนนไปแล้ว" value={customer.pointsRedeemedTotal.toLocaleString()} note="1 คะแนน = ส่วนลด 1 บาท" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader><CardTitle>ข้อมูลลูกค้า</CardTitle></CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="text-xs text-muted-foreground">รหัสสมาชิก</p><p className="mt-1 font-medium">{memberNo(customer.memberNo)}</p></div>
            <div><p className="text-xs text-muted-foreground">วันเกิด</p><p className="mt-1">{dateOnly(customer.birthday)}</p></div>
            <div><p className="text-xs text-muted-foreground">เบอร์โทร</p><a href={`tel:${customer.phone}`} className="mt-1 block hover:underline">{customer.phone || '—'}</a></div>
            <div><p className="text-xs text-muted-foreground">LINE</p><p className="mt-1">{customer.lineLinked ? customer.lineDisplayName || 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'}</p></div>
            <CustomerTierSelect id={customer.id} tier={customer.assignedTier} expiresAt={customer.tierExpiresAt} />
            <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">ที่อยู่ล่าสุด</p><p className="mt-1 whitespace-pre-line">{customer.address || '—'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>พฤติกรรมการสั่งซื้อ</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['จัดส่ง', customer.channelCounts.delivery], ['รับเอง', customer.channelCounts.pickup], ['หน้าร้าน', customer.channelCounts.inStore], ['พรีออเดอร์', customer.channelCounts.preorder]].map(([label, count]) => (
                <div key={String(label)} className="rounded-lg bg-gray-50 px-2 py-3"><p className="text-lg font-semibold tabular-nums">{count}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
              ))}
            </div>
            <div><p className="text-xs font-medium text-muted-foreground">เมนูที่ซื้อบ่อย</p>
              {customer.favoriteItems.length ? <ol className="mt-2 space-y-2 text-sm">{customer.favoriteItems.map((item, index) => <li key={item.name} className="flex justify-between gap-3"><span>{index + 1}. {item.name}</span><span className="tabular-nums text-muted-foreground">{item.qty} ชิ้น</span></li>)}</ol> : <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>ประวัติออเดอร์</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {customer.orders.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีออเดอร์</p> : customer.orders.map((order) => (
            <div key={order.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium tabular-nums">{order.orderNo}</span><Badge variant={STATUS_VARIANT[order.status] ?? 'outline'}>{STATUS_LABELS[order.status] ?? order.status}</Badge><Badge variant="outline">{DELIVERY_METHOD_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</Badge>{order.scheduledFor && <Badge className="bg-[#8c682c]">พรีออเดอร์ · {dateTime(order.scheduledFor)}</Badge>}</div>
                <span className="font-semibold tabular-nums">฿{order.totalAmount.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{dateTime(order.createdAt)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{orderItems(order.items)}</p>
              {(order.pointsEarned > 0 || order.pointsRedeemed > 0) && <p className="mt-2 text-xs text-[#8c682c]">ได้รับ {order.pointsEarned} คะแนน{order.pointsRedeemed > 0 ? ` · ใช้ ${order.pointsRedeemed} คะแนน` : ''}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ประวัติคะแนน</CardTitle></CardHeader>
        <CardContent>
          {customer.pointHistory.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีรายการคะแนน</p> : <div className="divide-y">{customer.pointHistory.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-medium">{item.orderNo || 'รายการคะแนน'}</p><p className="text-xs text-muted-foreground">{dateTime(item.createdAt)} · {item.type}</p></div><span className={`font-semibold tabular-nums ${item.points >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{item.points >= 0 ? '+' : ''}{item.points}</span></div>
          ))}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
