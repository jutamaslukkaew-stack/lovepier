import '../styles/globals.css'
import 'leaflet/dist/leaflet.css'
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
