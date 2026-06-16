import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const CATEGORY_COLORS = {
  chickenRice: 'bg-amber-100 text-amber-800',
  western:     'bg-blue-100 text-blue-800',
  sushi:       'bg-rose-100 text-rose-800',
  bbq:         'bg-orange-100 text-orange-800',
  oyster:      'bg-cyan-100 text-cyan-800',
  lightBites:  'bg-lime-100 text-lime-800',
  bakery:      'bg-pink-100 text-pink-800',
  coffee:      'bg-stone-200 text-stone-800',
  matcha:      'bg-green-100 text-green-800',
  nonCoffee:   'bg-purple-100 text-purple-800',
  bar:         'bg-indigo-100 text-indigo-800',
}

function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, menuData: {} }),
    })
    setLoading(false)
    if (res.ok) {
      sessionStorage.setItem('admin_pw', pw)
      onLogin(pw)
    } else {
      setError('รหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center px-4">
      <div className="bg-white border border-black/10 shadow-sm p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#999] mb-2">Love Pier</div>
          <h1 className="text-2xl font-light tracking-tight text-[#1a1a1a]">Back Office</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            placeholder="รหัสผ่าน"
            className="w-full border border-black/20 px-4 py-3 text-sm outline-none focus:border-black/50 bg-[#faf9f7]"
            autoFocus
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a1a1a] text-white py-3 text-xs tracking-[0.2em] uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      </div>
    </div>
  )
}

function EditPanel({ item, categories, onSave, onClose }) {
  const [form, setForm] = useState({ ...item })

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-[#faf9f7] sticky top-0">
          <h2 className="text-sm font-semibold tracking-wide text-[#1a1a1a]">แก้ไขรายการ</h2>
          <button onClick={onClose} className="text-[#999] hover:text-black text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-5 flex-1">
          {/* Category */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">หมวดหมู่</label>
            <select
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              className="w-full border border-black/20 px-3 py-2 text-sm bg-white outline-none focus:border-black/50"
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nameEn} — {c.nameTh}</option>
              ))}
            </select>
          </div>
          {/* Sub-category */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">หมวดย่อย</label>
            <input
              value={form.subCategory || ''}
              onChange={e => set('subCategory', e.target.value)}
              className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50"
            />
          </div>
          {/* Names */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ชื่อภาษาไทย</label>
              <input
                value={form.nameTh || ''}
                onChange={e => set('nameTh', e.target.value)}
                className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ชื่อภาษาอังกฤษ</label>
              <input
                value={form.nameEn || ''}
                onChange={e => set('nameEn', e.target.value)}
                className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50"
              />
            </div>
          </div>
          {/* Descriptions */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">คำบรรยายภาษาไทย</label>
            <textarea
              value={form.descTh || ''}
              onChange={e => set('descTh', e.target.value)}
              rows={2}
              className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">คำบรรยายภาษาอังกฤษ</label>
            <textarea
              value={form.descEn || ''}
              onChange={e => set('descEn', e.target.value)}
              rows={2}
              className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50 resize-none"
            />
          </div>
          {/* Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ราคา (บาท)</label>
              <input
                value={form.price || ''}
                onChange={e => set('price', e.target.value)}
                placeholder="เช่น 150 หรือ 80/100/120"
                className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50"
              />
              <p className="text-[10px] text-[#aaa] mt-1">สำหรับหลายราคา ใช้ / คั่น (ร้อน/เย็น/ปั่น)</p>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">Badge</label>
              <input
                value={form.badge || ''}
                onChange={e => set('badge', e.target.value)}
                placeholder="เช่น Signature"
                className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50"
              />
            </div>
          </div>
          {/* Visible toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => set('visible', !form.visible)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.visible ? 'bg-[#1a1a1a]' : 'bg-[#ccc]'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.visible ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-[#555]">{form.visible ? 'แสดงบนเว็บไซต์' : 'ซ่อน (ไม่แสดงบนเว็บไซต์)'}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/10 bg-[#faf9f7] sticky bottom-0 flex gap-3">
          <button
            onClick={() => onSave(form)}
            className="flex-1 bg-[#1a1a1a] text-white py-2.5 text-xs tracking-[0.15em] uppercase hover:bg-[#333] transition-colors"
          >
            บันทึก
          </button>
          <button
            onClick={onClose}
            className="px-6 border border-black/20 text-sm text-[#555] hover:border-black/40 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )
}

function AddItemModal({ categories, onSave, onClose }) {
  const [form, setForm] = useState({
    categoryId: categories[0]?.id || '',
    subCategory: '',
    nameTh: '',
    nameEn: '',
    descTh: '',
    descEn: '',
    price: '',
    badge: '',
    visible: true,
    sortOrder: 999,
  })

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-[#faf9f7]">
          <h2 className="text-sm font-semibold tracking-wide">เพิ่มรายการใหม่</h2>
          <button onClick={onClose} className="text-[#999] hover:text-black text-xl">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">หมวดหมู่ *</label>
            <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className="w-full border border-black/20 px-3 py-2 text-sm bg-white outline-none focus:border-black/50">
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">หมวดย่อย</label>
            <input value={form.subCategory} onChange={e => set('subCategory', e.target.value)} className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ชื่อภาษาไทย *</label>
              <input value={form.nameTh} onChange={e => set('nameTh', e.target.value)} className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ชื่อภาษาอังกฤษ *</label>
              <input value={form.nameEn} onChange={e => set('nameEn', e.target.value)} className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">คำบรรยายภาษาไทย</label>
            <textarea value={form.descTh} onChange={e => set('descTh', e.target.value)} rows={2} className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50 resize-none" />
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">คำบรรยายภาษาอังกฤษ</label>
            <textarea value={form.descEn} onChange={e => set('descEn', e.target.value)} rows={2} className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">ราคา *</label>
              <input value={form.price} onChange={e => set('price', e.target.value)} placeholder="เช่น 150" className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[#888] mb-1.5">Badge</label>
              <input value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="Signature" className="w-full border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-black/10 bg-[#faf9f7] flex gap-3">
          <button
            onClick={() => {
              if (!form.nameTh || !form.nameEn || !form.price) return alert('กรุณากรอกชื่อไทย ชื่ออังกฤษ และราคา')
              const newItem = { ...form, id: `custom-${Date.now()}` }
              onSave(newItem)
            }}
            className="flex-1 bg-[#1a1a1a] text-white py-2.5 text-xs tracking-[0.15em] uppercase hover:bg-[#333] transition-colors"
          >
            เพิ่มรายการ
          </button>
          <button onClick={onClose} className="px-6 border border-black/20 text-sm text-[#555] hover:border-black/40 transition-colors">ยกเลิก</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminMenu() {
  const [password, setPassword] = useState(null)
  const [data, setData] = useState(null)
  const [activeCat, setActiveCat] = useState(null)
  const [search, setSearch] = useState('')
  const [editItem, setEditItem] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const pw = sessionStorage.getItem('admin_pw')
    if (pw) setPassword(pw)
  }, [])

  const loadData = useCallback(async () => {
    const res = await fetch('/api/admin/menu')
    const json = await res.json()
    setData(json)
    if (!activeCat && json.categories?.length) setActiveCat(json.categories[0].id)
  }, [activeCat])

  useEffect(() => {
    if (password) loadData()
  }, [password, loadData])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function saveAll() {
    setSaving(true)
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, menuData: { items: data.items, categories: data.categories } }),
    })
    setSaving(false)
    if (res.ok) {
      setDirty(false)
      showToast('บันทึกสำเร็จ ✓')
    } else {
      showToast('เกิดข้อผิดพลาด', 'error')
    }
  }

  function updateItem(updated) {
    setData(d => ({ ...d, items: d.items.map(i => i.id === updated.id ? updated : i) }))
    setEditItem(null)
    setDirty(true)
    showToast('แก้ไขแล้ว — อย่าลืมกด "บันทึกทั้งหมด"', 'info')
  }

  function addItem(newItem) {
    setData(d => ({ ...d, items: [...d.items, newItem] }))
    setShowAdd(false)
    setDirty(true)
    showToast('เพิ่มรายการแล้ว — อย่าลืมกด "บันทึกทั้งหมด"', 'info')
  }

  function deleteItem(id) {
    if (!confirm('ลบรายการนี้?')) return
    setData(d => ({ ...d, items: d.items.filter(i => i.id !== id) }))
    setDirty(true)
  }

  function toggleVisible(id) {
    setData(d => ({ ...d, items: d.items.map(i => i.id === id ? { ...i, visible: !i.visible } : i) }))
    setDirty(true)
  }

  if (!password) return <LoginScreen onLogin={setPassword} />
  if (!data) return (
    <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
      <div className="text-sm text-[#999]">กำลังโหลด...</div>
    </div>
  )

  const categories = data.categories || []
  const allItems = data.items || []

  const catItems = activeCat
    ? allItems.filter(i => i.categoryId === activeCat && (
        !search || i.nameTh?.includes(search) || i.nameEn?.toLowerCase().includes(search.toLowerCase())
      ))
    : allItems

  const activeCatData = categories.find(c => c.id === activeCat)

  const catCounts = {}
  allItems.forEach(i => { catCounts[i.categoryId] = (catCounts[i.categoryId] || 0) + 1 })

  return (
    <>
      <Head><title>Back Office — Love Pier</title></Head>

      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#1a1a1a] text-white flex items-center justify-between px-5 py-3 shadow-lg">
        <div className="flex items-center gap-4">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#999]">Love Pier</span>
          <span className="text-[#555]">·</span>
          <span className="text-sm font-light">จัดการเมนู</span>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-[10px] text-amber-400 tracking-wide animate-pulse">● มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className={`px-5 py-1.5 text-xs tracking-[0.15em] uppercase transition-colors ${dirty ? 'bg-amber-500 hover:bg-amber-400 text-white' : 'bg-white/10 hover:bg-white/20 text-white'} disabled:opacity-50`}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
          </button>
          <button
            onClick={() => { sessionStorage.removeItem('admin_pw'); setPassword(null) }}
            className="text-[#888] hover:text-white text-xs transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="flex min-h-screen pt-12 bg-[#f5f3ef]">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-black/10 bg-white overflow-y-auto fixed top-12 bottom-0 left-0 z-30">
          <div className="p-4 border-b border-black/10">
            <div className="text-[10px] tracking-[0.2em] uppercase text-[#999] mb-1">หมวดหมู่</div>
            <div className="text-xs text-[#888]">{allItems.length} รายการทั้งหมด</div>
          </div>
          <nav className="py-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setActiveCat(cat.id); setSearch('') }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-xs transition-colors ${activeCat === cat.id ? 'bg-[#1a1a1a] text-white' : 'text-[#444] hover:bg-black/5'}`}
              >
                <span className="truncate">{cat.nameEn}</span>
                <span className={`shrink-0 ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeCat === cat.id ? 'bg-white/20 text-white' : 'bg-black/8 text-[#888]'}`}>
                  {catCounts[cat.id] || 0}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 ml-64 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-light text-[#1a1a1a] tracking-tight">
                {activeCatData?.nameEn}
              </h1>
              <p className="text-xs text-[#999] mt-0.5">{activeCatData?.nameTh} · {catItems.length} รายการ</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                className="border border-black/20 px-3 py-2 text-sm outline-none focus:border-black/50 bg-white w-48"
              />
              <button
                onClick={() => setShowAdd(true)}
                className="bg-[#1a1a1a] text-white px-4 py-2 text-xs tracking-[0.1em] uppercase hover:bg-[#333] transition-colors whitespace-nowrap"
              >
                + เพิ่มรายการ
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-black/10 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-[#faf9f7]">
                  <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium w-12">แสดง</th>
                  <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium">ชื่อภาษาไทย</th>
                  <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium hidden md:table-cell">English Name</th>
                  <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium hidden lg:table-cell">หมวดย่อย</th>
                  <th className="text-right px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium">ราคา</th>
                  <th className="text-center px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#888] font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {catItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#bbb] text-sm">ไม่พบรายการ</td>
                  </tr>
                )}
                {catItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-black/6 transition-colors ${item.visible ? '' : 'opacity-40'} ${idx % 2 === 0 ? 'bg-white' : 'bg-[#fdfcfb]'} hover:bg-[#f5f3ef]`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleVisible(item.id)}
                        title={item.visible ? 'คลิกเพื่อซ่อน' : 'คลิกเพื่อแสดง'}
                        className={`w-4 h-4 rounded-sm border transition-colors ${item.visible ? 'bg-[#1a1a1a] border-[#1a1a1a]' : 'border-black/30 bg-white'} flex items-center justify-center`}
                      >
                        {item.visible && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#1a1a1a]">{item.nameTh}</span>
                        {item.badge && (
                          <span className="text-[9px] tracking-[0.1em] uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{item.badge}</span>
                        )}
                      </div>
                      {item.descTh && (
                        <p className="text-[11px] text-[#aaa] mt-0.5 truncate max-w-[220px]">{item.descTh}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-[#666] text-xs">{item.nameEn}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.categoryId] || 'bg-gray-100 text-gray-700'}`}>
                        {item.subCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[#1a1a1a] text-sm whitespace-nowrap">
                      {item.price ? `฿${item.price}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditItem(item)}
                          className="text-[10px] tracking-[0.1em] uppercase text-[#555] hover:text-black border border-black/15 hover:border-black/40 px-2.5 py-1 transition-colors"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 transition-colors px-1"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stats footer */}
          <div className="mt-4 flex items-center gap-6 text-xs text-[#999]">
            <span>{catItems.filter(i => i.visible).length} รายการที่แสดง</span>
            <span>{catItems.filter(i => !i.visible).length} รายการที่ซ่อน</span>
            {data.lastUpdated && <span>อัพเดทล่าสุด: {data.lastUpdated}</span>}
          </div>
        </main>
      </div>

      {/* Edit Panel */}
      {editItem && (
        <EditPanel
          item={editItem}
          categories={categories}
          onSave={updateItem}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddItemModal
          categories={categories}
          onSave={addItem}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 text-sm shadow-lg transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' :
          toast.type === 'info' ? 'bg-[#1a1a1a] text-amber-300' :
          'bg-[#1a1a1a] text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </>
  )
}
