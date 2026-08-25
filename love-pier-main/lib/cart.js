import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lp_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('lp_cart', JSON.stringify(items)) } catch {}
  }, [items])

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: Math.max(1, Math.floor(Number(item.qty) || 1)) }]
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter((i) => i.id !== id)
      return prev.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i)
    })
  }, [])

  // One free-text note per cart LINE (applies to the whole quantity of that
  // item, not per unit) — e.g. "หวานน้อย, นมอัลมอนด์". Set at review time in
  // the order summary, not when adding, so it never blocks the quick + tap.
  const updateNote = useCallback((id, note) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, note } : i))
  }, [])

  // Structured per-line options (sweetness / coffee bean / protein — see
  // lib/menuOptions.js), same "set at review time" rule and per-line (not
  // per-unit) scope as updateNote above. Undefined until the customer picks
  // something; the Summary UI shows the first option as selected by default
  // without writing it here (see OrderFlow.js).
  //
  // One setter keyed by field rather than one per option: the groups are
  // data now, so a new group must not need a new context method (and every
  // consumer re-render) to go with it.
  const updateOption = useCallback((id, field, value) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const totalQty = items.reduce((sum, i) => sum + i.qty, 0)
  const totalPrice = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateNote, updateOption, clearCart, totalQty, totalPrice, isOpen, openCart, closeCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
