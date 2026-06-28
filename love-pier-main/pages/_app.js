import '../styles/globals.css'
import { useEffect } from 'react'
import Layout from '../components/Layout'
import { LanguageProvider, useLanguage } from '../lib/language'
import { CartProvider } from '../lib/cart'
import CartDrawer from '../components/CartDrawer'

function LangSync() {
  const { lang } = useLanguage()
  useEffect(() => {
    document.documentElement.lang = lang === 'th' ? 'th' : lang === 'zh' ? 'zh' : 'en'
  }, [lang])
  return null
}

export default function App({ Component, pageProps }) {
  useEffect(() => {
    let lenis
    import('lenis').then(({ default: Lenis }) => {
      lenis = new Lenis({ duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf) }
      requestAnimationFrame(raf)
    }).catch(() => {})

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
        }
      })
    }, { threshold: 0.08 })

    function observeReveal() {
      document.querySelectorAll('.reveal, .reveal-img').forEach((el) => {
        if (!el.classList.contains('is-visible')) {
          observer.observe(el)
        }
      })
    }

    observeReveal()
    const mo = new MutationObserver(observeReveal)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      lenis?.destroy()
      observer.disconnect()
      mo.disconnect()
    }
  }, [])

  return (
    <LanguageProvider>
      <LangSync />
      <CartProvider>
        <Layout><Component {...pageProps} /></Layout>
        <CartDrawer />
      </CartProvider>
    </LanguageProvider>
  )
}
