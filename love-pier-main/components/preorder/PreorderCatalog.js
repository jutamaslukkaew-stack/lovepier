import { useMemo, useState } from 'react'
import { useCart } from '../../lib/cart'

function Media({ media, name }) {
  if (media.type === 'video') {
    if (/youtu(?:\.be|be\.com)/i.test(media.url)) {
      const id = media.url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/)?.[1]
      return <iframe src={id ? `https://www.youtube.com/embed/${id}` : media.url} title={name} className="aspect-video w-full" allowFullScreen />
    }
    return <video src={media.url} controls playsInline preload="metadata" className="aspect-video w-full object-cover" />
  }
  return <img src={media.url} alt={media.label || name} className="aspect-video w-full object-cover" />
}

export default function PreorderCatalog({ preorderItems = [], onCartClick, cartBlockedNote = '' }) {
  const { addItem, totalQty } = useCart()
  const [selected, setSelected] = useState(null)
  const groups = useMemo(() => Object.entries(preorderItems.reduce((all, item) => {
    ;(all[item.category] ||= []).push(item)
    return all
  }, {})), [preorderItems])

  return <div className="min-h-screen bg-[#f5f2ee] pb-28">
    <section className="px-5 py-10 text-center sm:py-14"><p className="text-[10px] font-semibold tracking-[0.3em] text-[#8c682c]">LOVE PIER PRE ORDER</p><h1 className="mt-3 font-display text-[clamp(38px,8vw,70px)] font-light">เมนูสั่งล่วงหน้า</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-black/55">อาหารทำตามออเดอร์ พร้อมรูปและวิดีโอประกอบ · สั่งล่วงหน้าอย่างน้อย 3 วัน</p></section>
    {groups.length === 0 ? <p className="px-5 py-16 text-center text-black/50">ยังไม่มีเมนูที่เปิดรับพรีออเดอร์</p> : groups.map(([category, items]) => <section key={category} className="border-t border-black/10 px-5 py-9 sm:px-8"><div className="mx-auto max-w-6xl"><h2 className="font-display text-3xl font-light">{category}</h2><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => {
      const cover = item.coverImageUrl || item.media?.find((m) => m.type === 'image')?.url
      return <article key={item.id} className="overflow-hidden rounded-2xl border border-black/10 bg-[#fffdf8] shadow-sm"><button type="button" onClick={() => setSelected(item)} className="block w-full text-left"><div className="aspect-[4/3] bg-black/5">{cover ? <img src={cover} alt={item.nameTh} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-black/35">กำลังเตรียมรูปภาพ</div>}</div><div className="p-5"><div className="flex justify-between gap-3"><h3 className="text-lg font-semibold">{item.nameTh}</h3><strong>฿{Number(item.price).toLocaleString()}</strong></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-black/55">{item.descriptionTh || `สั่งล่วงหน้าอย่างน้อย ${item.leadDays} วัน`}</p><p className="mt-3 text-xs text-[#8c682c]">ขั้นต่ำ {item.minQuantity} {item.unit} · ล่วงหน้า {item.leadDays} วัน{item.media?.some((m) => m.type === 'video') ? ' · มีวิดีโอ' : ''}</p></div></button><div className="px-5 pb-5"><button type="button" onClick={() => addItem({ id: item.id, name: item.nameTh, price: String(item.price), image: cover, qty: item.minQuantity, leadDays: item.leadDays, preorder: true })} className="w-full rounded-xl bg-[#4a3520] py-3 text-sm font-semibold text-white">เพิ่มลงรายการ</button></div></article>
    })}</div></div></section>)}
    {selected && <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-5" onClick={() => setSelected(null)}><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#fffdf8] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}><div className="grid gap-2">{(selected.media?.length ? selected.media : selected.coverImageUrl ? [{ type: 'image', url: selected.coverImageUrl }] : []).map((m, i) => <Media key={`${m.url}-${i}`} media={m} name={selected.nameTh} />)}</div><div className="p-6"><div className="flex justify-between gap-4"><h2 className="font-display text-3xl">{selected.nameTh}</h2><strong className="text-xl">฿{Number(selected.price).toLocaleString()}</strong></div><p className="mt-3 whitespace-pre-line text-sm leading-7 text-black/60">{selected.descriptionTh}</p><p className="mt-4 text-sm text-[#8c682c]">ขั้นต่ำ {selected.minQuantity} {selected.unit} · สั่งล่วงหน้า {selected.leadDays} วัน</p><button type="button" className="mt-5 w-full rounded-xl bg-[#4a3520] py-3 text-white" onClick={() => { addItem({ id: selected.id, name: selected.nameTh, price: String(selected.price), qty: selected.minQuantity, leadDays: selected.leadDays, preorder: true }); setSelected(null) }}>เพิ่มลงรายการ</button><button type="button" className="mt-2 w-full py-2 text-sm text-black/50" onClick={() => setSelected(null)}>ปิด</button></div></div></div>}
    {totalQty > 0 && <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-black/10 bg-[#fffdf8]/95 p-4 backdrop-blur"><button type="button" onClick={onCartClick} disabled={Boolean(cartBlockedNote)} className="mx-auto block w-full max-w-lg rounded-xl bg-[#4a3520] py-3.5 font-semibold text-white disabled:opacity-50">ดูรายการสั่งซื้อ ({totalQty})</button>{cartBlockedNote ? <p className="mt-1 text-center text-xs text-red-600">{cartBlockedNote}</p> : null}</div>}
  </div>
}
