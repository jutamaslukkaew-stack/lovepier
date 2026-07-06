# ระบบสั่งเดลิเวอรี + LINE + QR PromptPay — คู่มือเปิดใช้งาน

ระบบสั่งซื้อถูกฝังอยู่ในเว็บ (หน้า `/delivery`) เรียบร้อยแล้ว เหลือแค่กรอกค่า 3 อย่างเพื่อเปิดใช้งานครบทุกฟีเจอร์

## 1. สร้างตารางในฐานข้อมูล (ทำครั้งเดียว)
รันไฟล์ [`lib/db/orders.sql`](lib/db/orders.sql) ใน Supabase → SQL Editor
> ✅ รันให้แล้วในระบบจริง — ตาราง `orders` และ `customers` พร้อมใช้งาน

## 2. ตั้งค่า Environment variables
เติมค่าใน `.env.local` (และใน Vercel → Project → Settings → Environment Variables):

| ตัวแปร | ได้จากไหน | จำเป็น |
|--------|-----------|--------|
| `NEXT_PUBLIC_PROMPTPAY_ID` | ตั้งไว้ `010554511741402` (Biller ID บริษัท เลิฟเพียร์ จำกัด) | ✅ เพื่อให้ QR ทำงาน |
| `NEXT_PUBLIC_PROMPTPAY_TYPE` | ตั้งไว้ `biller` (QR บิลเพย์เมนต์นิติบุคคล) — เว้นว่างถ้าใช้เบอร์/บัตร | ✅ คู่กับ ID ด้านบน |
| `NEXT_PUBLIC_LIFF_ID` | LINE Developers → LINE Login channel → แท็บ LIFF (เช่น `2010601364-AbCdEfGh`) | ทางเลือก — เปิดปุ่ม "เข้าสู่ระบบด้วย LINE" |
| `NEXT_PUBLIC_LINE_OA_ID` | LINE OA basic ID (มี @ นำหน้า) ปัจจุบันตั้งไว้ `@891jhcya` | ✅ ปุ่มส่งสลิป |

> **QR เป็นแบบ Bill Payment (Biller ID) ของนิติบุคคล** — เงินเข้าบัญชีบริษัทโดยตรง และแนบเลขอ้างอิง (payment_ref เช่น `LPMR8WG1S9`) ไว้ในทุก QR + บันทึกในตาราง orders → ร้านเช็คยอดเงินเข้าตรงกับออเดอร์ได้จาก Ref บน statement
>
> ⚠️ **ก่อนใช้จริง: สแกน QR ที่เว็บสร้างด้วยแอปธนาคารเพื่อยืนยันว่าขึ้นชื่อ "บริษัท เลิฟเพียร์ จำกัด" และยอดถูกต้อง** (ไม่ต้องกดจ่าย แค่ดูว่าปลายทางถูก)

> ระบบออกแบบให้ทำงานได้แม้ยังไม่ตั้ง LIFF ID — ปุ่ม LINE จะถูกซ่อน ลูกค้ากรอกข้อมูลเองได้ปกติ

## 3. ตั้งค่า LIFF endpoint (เมื่อทำ LINE Login)
ใน LINE Developers → LIFF app → **Endpoint URL** ใส่:
```
https://lovepier.cafe/delivery
```

## Flow การสั่งซื้อ (4 ขั้น อยู่ใน `components/CartDrawer.js`)
1. **ตะกร้า** — เพิ่ม/ลดรายการ
2. **ข้อมูลจัดส่ง** — ชื่อ/เบอร์/ที่อยู่ + ปุ่ม LINE Login (เติมชื่อ+ที่อยู่เดิมอัตโนมัติสำหรับลูกค้าเก่า)
3. **ชำระเงิน** — QR PromptPay สร้างจากยอดในตะกร้าอัตโนมัติ
4. **สำเร็จ** — แสดงเลขออเดอร์ + ปุ่มส่งสลิปทาง LINE

## การยืนยันการชำระเงิน
ตอนนี้เป็นแบบ **ส่งสลิปทาง LINE** (ฟรี ไม่มีค่าธรรมเนียม) ออเดอร์บันทึกสถานะ `pending`
อนาคตถ้าต้องการยืนยันอัตโนมัติ ต่อ payment gateway (Omise / GB Prime Pay / LINE Pay) ได้ โดยเพิ่ม webhook อัปเดต `orders.status = 'paid'`

## แจ้งเตือนออเดอร์ใหม่เข้า LINE ร้าน (ทางเลือก)
ทุกครั้งที่มีออเดอร์ใหม่ ระบบจะ push ข้อความสรุปเข้า LINE ร้านได้ ต้องตั้ง 2 ค่า:

| ตัวแปร | ได้จากไหน |
|--------|-----------|
| `LINE_MESSAGING_TOKEN` | LINE Developers → channel **Messaging API** ของ OA → **Channel access token (long-lived)** → Issue |
| `LINE_ORDER_NOTIFY_TO` | userId หรือ groupId ปลายทางที่จะรับแจ้งเตือน |

**วิธีหา `LINE_ORDER_NOTIFY_TO`:**
- **ส่งเข้าตัวเอง (เจ้าของร้าน):** แอด OA เป็นเพื่อน → ใน LINE Developers → Messaging API → เลื่อนหา **"Your user ID"** = userId ของคุณ → ใช้ค่านี้
- **ส่งเข้ากลุ่มพนักงาน:** สร้างกลุ่ม LINE + เชิญบอท OA เข้ากลุ่ม → ต้องดัก groupId ผ่าน webhook (ยุ่งกว่า) — แนะนำเริ่มแบบ userId ก่อน

> ถ้าเว้นว่างไว้ = ปิดแจ้งเตือน (ระบบยังทำงานปกติ ไม่ error)

## Badge ออเดอร์ใหม่ใน /admin
Sidebar จะขึ้น **ตัวเลขสีแดง** ข้างเมนู "ออเดอร์" = จำนวนออเดอร์ที่ยังสถานะ `รอชำระเงิน (pending)` — อัปเดตอัตโนมัติเมื่อเปลี่ยนสถานะ

## ไฟล์ที่เกี่ยวข้อง
- `components/CartDrawer.js` — UI เช็คเอาท์ 4 ขั้น
- `pages/api/orders.js` — บันทึกออเดอร์ + จำข้อมูลลูกค้า + แจ้งเตือน LINE
- `pages/api/customer.js` — ดึงข้อมูลลูกค้าเก่าจาก LINE userId
- `lib/promptpay.js` — สร้าง payload QR (มาตรฐาน EMVCo)
- `lib/liff.js` — LINE Login / ดึงโปรไฟล์
- `lib/lineMessaging.js` — push แจ้งเตือนออเดอร์ใหม่
- `app/admin/orders/` + `app/admin/actions/orders.ts` — หน้าดูออเดอร์ + เปลี่ยนสถานะ
- `lib/db/schema.ts` + `lib/db/orders.sql` — ตาราง orders/customers
