import '../styles/globals.css'
import { useEffect } from 'react'
import Layout from '../components/Layout'
import { LanguageProvider } from '../lib/language'

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
      <Layout><Component {...pageProps} /></Layout>
    </LanguageProvider>
  )
}
