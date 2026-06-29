import { useEffect } from 'react'
import { useCart } from '../lib/cart'
import { useLanguage } from '../lib/language'

const COPY = {
  th: {
    title: 'รายการสั่ง',
    empty: 'ยังไม่มีรายการ',
    total: 'รวม',
    clear: 'ล้างรายการ',
    order: 'ส่งออเดอร์',
    currency: '฿',
    close: 'ปิด',
  },
  en: {
    title: 'Your Order',
    empty: 'No items yet',
    total: 'Total',
    clear: 'Clear',
    order: 'Place Order',
    currency: '฿',
    close: 'Close',
  },
  zh: {
    title: '我的订单',
    empty: '暂无商品',
    total: '合计',
    clear: '清空',
    order: '提交订单',
    currency: '฿',
    close: '关闭',
  },
}

export default function CartDrawer() {
  const { items, addItem, removeItem, clearCart, totalQty, totalPrice, isOpen, closeCart } = useCart()
  const { lang } = useLanguage()
  const t = COPY[lang] || COPY.en

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  function handleOrder() {
    const lines = items.map((i) => `${i.name} x${i.qty} = ฿${(parseFloat(i.price) * i.qty).toFixed(0)}`).join('\n')
    const msg = encodeURIComponent(`สวัสดีครับ ขอสั่งอาหาร:\n${lines}\n\nรวม ฿${totalPrice.toFixed(0)}`)
    window.open(`https://line.me/R/oaMessage/@694eccdr/?${msg}`, '_blank')
  }

  return (
    <>
      {/* backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[190] bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80dvh' }}
      >
        {/* handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-black/15" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-black/10">
          <h2 className="font-semibold text-[15px] text-ink tracking-wide">
            {t.title}
            {totalQty > 0 && (
              <span className="ml-2 bg-[#2d6a1f] text-white text-[11px] px-2 py-0.5 rounded-full font-normal">
                {totalQty}
              </span>
            )}
          </h2>
          <button onClick={closeCart} className="text-black/40 hover:text-black text-xl leading-none p-1">✕</button>
        </div>

        {/* body */}
        <div className="overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-3" style={{ maxHeight: 'calc(80dvh - 140px)' }}>
          {items.length === 0 ? (
            <p className="text-center text-sm text-black/40 py-10">{t.empty}</p>
          ) : items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[#f2ede6]" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink leading-snug truncate">{item.name}</p>
                <p className="text-[12px] text-black/50 tabular-nums">฿{Math.round(parseFloat(item.price))} × {item.qty}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10"
                >−</button>
                <span className="text-[13px] font-semibold w-4 text-center">{item.qty}</span>
                <button
                  onClick={() => addItem(item)}
                  className="w-7 h-7 rounded-full bg-black/[0.06] flex items-center justify-center text-ink font-semibold text-sm hover:bg-black/10"
                >+</button>
              </div>
              <p className="text-[13px] font-semibold tabular-nums text-ink shrink-0 w-12 text-right">
                ฿{Math.round(parseFloat(item.price) * item.qty)}
              </p>
            </div>
          ))}
        </div>

        {/* footer */}
        {items.length > 0 && (
          <div className="border-t border-black/10 px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <button onClick={clearCart} className="text-[11px] text-black/40 hover:text-black/70 tracking-wide uppercase">
                {t.clear}
              </button>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] tracking-[0.12em] uppercase text-black/50">{t.total}</span>
                <span className="font-semibold text-[17px] text-ink tabular-nums">฿{Math.round(totalPrice)}</span>
              </div>
            </div>
            <button
              onClick={handleOrder}
              className="w-full py-3.5 rounded-xl bg-[#2d6a1f] text-white font-semibold text-[14px] tracking-wide hover:bg-[#245517] transition-colors"
            >
              {t.order}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
