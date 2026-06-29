import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
try {
  const envContent = readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
} catch { /* ignore */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { error } = await supabase.from('events').insert([
    {
      title_th: 'Flow Sunset',
      title_en: 'Flow Sunset',
      title_zh: 'Flow Sunset',
      title_em: 'Sunset',
      event_date: '2026-06-27',
      time_range: '16:00 – 20:00',
      time_sub: 'DJ SUPACHAI 18:00 – 20:00',
      location: 'The Symphony Club',
      price: 500,
      entry_sub_th: 'เล่นกิจกรรมในคลับไม่จำกัด',
      entry_sub_en: 'Unlimited club activities included',
      entry_sub_zh: '俱乐部内活动不限次数',
      description_th: 'Surf Pool · Skimboard · Kayak · Sup Board อาหาร เครื่องดื่ม และสินค้าพาร์ทเนอร์ตลอดงาน รับริสแบนด์และเครื่องดื่มกระป๋องฟรี 1 แก้ว',
      description_en: 'Surf Pool · Skimboard · Kayak · Sup Board. Food, drinks and partner products all evening. Free wristband and one canned drink.',
      description_zh: 'Surf Pool · Skimboard · Kayak · Sup Board，餐饮与合作伙伴产品供应至活动结束，赠送手环及一罐免费饮料。',
      category_th: 'ปาร์ตี้',
      category_en: 'Party',
      category_zh: '派对',
      image_url: '/uploads/events-flow-sunset.webp',
      is_featured: true,
      is_active: true,
      sort_order: 0,
    },
  ])

  if (error) {
    console.error('❌ seed failed:', error.message)
    process.exit(1)
  }
  console.log('✅ seed events done')
}

main().catch((e) => { console.error(e); process.exit(1) })
