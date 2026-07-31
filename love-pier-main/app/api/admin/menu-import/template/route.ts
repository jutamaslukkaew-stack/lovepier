import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { COLUMNS, SHEET_NAME } from '@/lib/menuImport/spec'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Blank template: the `menu` sheet with the exact header row, plus a short
// `readme` sheet listing the category numbers so team A can fill it in.
export async function GET() {
  const user = await requireAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const wb = XLSX.utils.book_new()

  const menu = XLSX.utils.aoa_to_sheet([[...COLUMNS]])
  XLSX.utils.book_append_sheet(wb, menu, SHEET_NAME)

  const readme = XLSX.utils.aoa_to_sheet([
    ['category_no', 'name_th'],
    ['1', 'ข้าวมันไก่ & ข้าว'],
    ['2', 'พาสต้า & อาหารตะวันตก'],
    ['3', 'ซูชิ & โรล'],
    ['4', 'บาร์บีคิว & ซีฟู้ดย่าง'],
    ['6', 'หอยนางรม & โอเชียนบาร์'],
    ['7', 'อาหารเช้า'],
    ['8', 'เค้ก & เบเกอรี่'],
    ['9', 'กาแฟ & เครื่องดื่มไม่มีแอลกอฮอล์'],
    ['9.5', 'ไอศกรีม'],
    ['10', 'บาร์ & ไวน์'],
  ])
  XLSX.utils.book_append_sheet(wb, readme, 'categories')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="lovepier_menu_template.xlsx"',
    },
  })
}
