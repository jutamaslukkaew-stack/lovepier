import { listOrders } from '@/app/admin/actions/orders'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrderStatusSelect } from '@/components/admin/order-status-select'
import { STATUS_LABELS, STATUS_VARIANT } from '@/app/admin/orders/status'

export const dynamic = 'force-dynamic'

type OrderItem = { id?: string; name?: string; price?: number; qty?: number }

function formatDate(d: Date | string | null) {
  if (!d) return ''
  return new Date(d).toLocaleString('th-TH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminOrdersPage() {
  const orders = await listOrders()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">ออเดอร์</h1>
        <span className="text-sm text-muted-foreground">{orders.length} รายการล่าสุด</span>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีออเดอร์
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const items = (Array.isArray(o.items) ? o.items : []) as OrderItem[]
            return (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-3">
                  {/* header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{o.orderNo}</span>
                        <Badge variant={STATUS_VARIANT[o.status] ?? 'outline'}>
                          {STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(o.createdAt)}
                        {o.paymentRef ? ` · Ref: ${o.paymentRef}` : ''}
                      </p>
                    </div>
                    <OrderStatusSelect id={o.id} status={o.status} />
                  </div>

                  {/* customer */}
                  <div className="text-sm">
                    <p className="font-medium">
                      {o.customerName}{' '}
                      <a
                        href={`tel:${o.phone}`}
                        className="text-muted-foreground font-normal hover:underline"
                      >
                        {o.phone}
                      </a>
                    </p>
                    {o.address && (
                      <p className="text-muted-foreground text-[13px] leading-snug mt-0.5">
                        {o.address}
                      </p>
                    )}
                    {o.note && (
                      <p className="text-[13px] text-amber-700 mt-0.5">📝 {o.note}</p>
                    )}
                  </div>

                  {/* items */}
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-[13px] space-y-0.5">
                    {items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>
                          {it.name} × {it.qty}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          ฿{Math.round((Number(it.price) || 0) * (Number(it.qty) || 0))}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1 font-semibold">
                      <span>รวม</span>
                      <span className="tabular-nums">฿{o.totalAmount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
