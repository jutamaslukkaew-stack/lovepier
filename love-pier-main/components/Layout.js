import { useState } from 'react'
import Nav from './Nav'
import MenuOverlay from './MenuOverlay'

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
    </>
  )
}
