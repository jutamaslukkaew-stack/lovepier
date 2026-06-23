/**
 * Create (or update) an admin user in Supabase Auth.
 *
 *   npm run create-admin -- <email> <password>
 *
 * Defaults to cafe.lovepier@gmail.com if no email is given.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { createClient } from '@supabase/supabase-js'

const DEFAULT_EMAIL = 'cafe.lovepier@gmail.com'

async function main() {
  const email = process.argv[2] ?? DEFAULT_EMAIL
  const password = process.argv[3]

  if (!password) {
    console.error('❌ ต้องระบุรหัสผ่าน:  npm run create-admin -- ' + email + ' <password>')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('❌ รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('❌ ยังไม่ได้ตั้ง NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน .env.local')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Already exists? → update the password instead of failing.
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    })
    if (error) throw error
    console.log(`✅ อัปเดตรหัสผ่านของ ${email} แล้ว`)
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    console.log(`✅ สร้างบัญชี admin: ${email}`)
  }
  console.log('ล็อกอินได้ที่ /admin/login')
}

main().catch((e) => {
  console.error('❌', e instanceof Error ? e.message : e)
  process.exit(1)
})
