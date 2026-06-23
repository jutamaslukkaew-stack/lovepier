# Menu Backoffice — Setup Guide

ระบบหลังบ้านจัดการเมนู (Next.js App Router + Supabase + Drizzle + shadcn/ui)
อยู่ที่เส้นทาง **`/admin`**

---

## 1. สร้าง Supabase project

1. ไปที่ https://supabase.com → **New project** (เลือก region สิงคโปร์เพื่อความเร็ว)
2. ตั้งรหัสผ่าน database แล้วจดไว้
3. รอจน project พร้อม

## 2. ใส่ค่า environment

```bash
cp .env.example .env.local
```

เปิด `.env.local` แล้วกรอกจาก **Supabase Dashboard**:

| ตัวแปร | หาได้จาก |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (เก็บเป็นความลับ) |
| `DATABASE_URL` | Project Settings → Database → Connection string → **URI** (ใส่รหัสผ่านแทน `[PASSWORD]`) |

> สำหรับ Vercel: ใช้ connection string แบบ **pooler (port 6543)** และเพิ่ม `?pgbouncer=true`

## 3. สร้างตารางในฐานข้อมูล

```bash
npm run db:push      # สร้าง categories + menu_items ตาม schema
```

แล้วเปิด **Supabase → SQL Editor** วางเนื้อหาไฟล์ `lib/db/rls.sql` แล้วกด Run
(เปิด Row Level Security + สร้าง bucket `menu-images` + policies)

## 4. ใส่ข้อมูลตัวอย่าง (ไม่บังคับ)

```bash
npm run db:seed      # ใส่หมวด + เมนูตัวอย่างจากเมนูจริง
```

## 5. สร้างบัญชี admin

Supabase Dashboard → **Authentication → Users → Add user**
กรอกอีเมล + รหัสผ่าน (ติ๊ก auto-confirm) — ใช้บัญชีนี้ล็อกอินที่ `/admin/login`

## 6. รัน

```bash
npm run dev
```

เปิด http://localhost:3000/admin → ล็อกอิน → จัดการเมนูได้เลย

---

## คำสั่งที่มีให้

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run db:generate` | สร้าง migration SQL จาก schema |
| `npm run db:push` | push schema เข้า DB ตรงๆ (เหมาะตอน dev) |
| `npm run db:migrate` | รัน migration ที่ generate ไว้ |
| `npm run db:studio` | เปิด Drizzle Studio ดู/แก้ข้อมูล |
| `npm run db:seed` | ใส่ข้อมูลตัวอย่าง |
| `npm run typecheck` | ตรวจ TypeScript |

## โครงสร้างไฟล์

```
app/admin/            หน้า admin (App Router, TypeScript)
  login/              หน้าเข้าสู่ระบบ
  categories/         จัดการหมวด
  menu/               จัดการเมนู + อัพโหลดรูป
  actions/            server actions (CRUD + auth)
components/admin/     UI ของ admin
components/ui/         shadcn/ui components
lib/db/               Drizzle schema, client, migration, seed, rls.sql
lib/supabase/         Supabase clients (browser/server/middleware/admin)
lib/upload-image.ts   อัพโหลดรูป (บีบอัดเป็น webp → Storage)
middleware.ts         ป้องกัน /admin (redirect ถ้าไม่ล็อกอิน)
```

## ⚠️ หมายเหตุเรื่องหน้าเว็บ public (`/menu`)

หน้าเมนู public ปัจจุบันยังใช้ข้อมูลฮาร์ดโค้ดใน `pages/menu.js` ซึ่งมีฟีเจอร์ที่
schema เฟสนี้ **ยังไม่รองรับ** ได้แก่ ราคาแยกขนาด (ร้อน/เย็น/ปั่น), ตัวเลือกเสริม
(add-ons), taste notes — ตาม prompt ที่ระบุว่า price variants อยู่นอกขอบเขตเฟสนี้

ฟังก์ชัน `getPublicMenu()` / `getFeaturedItems()` ใน `lib/data/menu.ts` พร้อมดึง
ข้อมูลจาก DB แล้ว แต่ยังไม่ได้ต่อเข้าหน้า `/menu` เพื่อไม่ให้สูญเสียฟีเจอร์ราคาแยกขนาด
ของเมนูจริง — เมื่อพร้อมขยาย schema รองรับราคาแยกขนาด ค่อย migrate หน้า public แบบเต็ม
