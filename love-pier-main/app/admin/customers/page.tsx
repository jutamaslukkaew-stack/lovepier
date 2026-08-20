import { listCustomers } from '@/app/admin/actions/customers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { CopyPhonesButton } from '@/components/admin/copy-phones-button'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default async function AdminCustomersPage() {
  const customers = await listCustomers()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">ลูกค้า</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            รายชื่อ + เบอร์โทรของทุกคนที่เคยสั่งซื้อ เก็บไว้ใช้ยิงข้อความ/โปรโมชันในอนาคต
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{customers.length} คน</span>
          <CopyPhonesButton phones={customers.map((c) => c.phone)} />
        </div>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มีลูกค้าในระบบ
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>เบอร์โทร</TableHead>
                    <TableHead>สมาชิก</TableHead>
                    <TableHead className="text-right">คะแนน</TableHead>
                    <TableHead>ที่อยู่</TableHead>
                    <TableHead className="text-center">สั่งแล้ว</TableHead>
                    <TableHead>ครั้งล่าสุด</TableHead>
                    <TableHead>LINE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        <Link href={`/admin/customers/${c.id}`} className="hover:underline">{c.name || '—'}</Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>
                      </TableCell>
                      <TableCell>
                        {c.memberNo != null ? (
                          <Badge>LP{String(c.memberNo).padStart(3, '0')}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.pointsBalance.toLocaleString()}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground">
                        {c.address || '—'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{c.orderCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(c.lastOrderAt)}
                      </TableCell>
                      <TableCell>
                        {c.lineLinked ? (
                          <Badge variant="secondary">เชื่อมแล้ว</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">ไม่มี</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
