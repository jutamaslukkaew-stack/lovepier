import { useState, useEffect } from 'react'
import Nav from './Nav'
import MenuOverlay from './MenuOverlay'

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-50 w-11 h-11 flex items-center justify-center border border-[#4a3520]/30 bg-[#f5f2ee] text-[#4a3520] hover:bg-[#4a3520] hover:text-white transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3,10 8,5 13,10" />
      </svg>
    </button>
  )
}

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const openMenu = () => {
    setMenuOpen(true)
    if (typeof document !== 'undefined') document.body.classList.add('menu-open')
  }
  const closeMenu = () => {
    setMenuOpen(false)
    if (typeof document !== 'undefined') document.body.classList.remove('menu-open')
  }

  return (
    <>
      <Nav onOpenMenu={openMenu} />
      <MenuOverlay isOpen={menuOpen} onClose={closeMenu} />
      <main className="bg-bg font-sans text-ink overflow-x-hidden">{children}</main>
      <BackToTop />
    </>
  )
}
