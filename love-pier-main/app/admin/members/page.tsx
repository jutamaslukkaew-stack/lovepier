import Link from 'next/link'
import { listMembers } from '@/app/admin/actions/customers'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

function memberNo(value: number) {
  return `LP${String(value).padStart(3, '0')}`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default async function AdminMembersPage() {
  const members = await listMembers()
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">สมาชิก Love Pier ID</h1>
          <p className="mt-1 text-sm text-muted-foreground">เฉพาะลูกค้าที่สมัครสมาชิกและได้รับรหัส LP แล้ว</p>
        </div>
        <Badge variant="secondary">{members.length} สมาชิก</Badge>
      </div>
      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">ยังไม่มีสมาชิกในระบบ</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>รหัส</TableHead><TableHead>ชื่อ</TableHead><TableHead>เบอร์โทร</TableHead>
                <TableHead>วันเกิด</TableHead><TableHead className="text-right">คะแนน</TableHead>
                <TableHead className="text-center">ออเดอร์</TableHead><TableHead>ล่าสุด</TableHead>
              </TableRow></TableHeader>
              <TableBody>{members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><Badge>{memberNo(m.memberNo!)}</Badge></TableCell>
                  <TableCell className="font-medium"><Link href={`/admin/customers/${m.id}`} className="hover:underline">{m.name || m.lineDisplayName || '—'}</Link></TableCell>
                  <TableCell><a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a></TableCell>
                  <TableCell>{m.birthday ? formatDate(m.birthday) : '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{m.pointsBalance.toLocaleString()}</TableCell>
                  <TableCell className="text-center tabular-nums">{m.orderCount}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(m.lastOrderAt)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
