import { useAuth } from '../state/AuthContext';
export default function Dashboard() {
  const { user } = useAuth();
  return <main><section className="hero"><span className="eyebrow">DASHBOARD</span><h1>สวัสดี, {user?.name}</h1><p>พื้นที่สำหรับสร้างคำถาม ตรวจคำตอบ และติดตามผลการเรียนรู้</p></section><section className="grid"><article><small>แบบทดสอบ</small><strong>สร้างด้วย AI</strong><p>กำหนดหัวข้อ ระดับ และจำนวนข้อได้ทันที</p></article><article><small>การประเมิน</small><strong>ผลลัพธ์พร้อมคำแนะนำ</strong><p>Gemini ช่วยตรวจและอธิบายจุดที่ควรพัฒนา</p></article><article><small>ไฟล์ประกอบ</small><strong>จัดเก็บบน S3</strong><p>อัปโหลดผ่าน presigned URL โดยไม่เปิดเผย bucket</p></article></section></main>;
}
