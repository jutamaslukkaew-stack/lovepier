import { createContext, useContext, useMemo, useState } from 'react'

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = window.localStorage.getItem('lp_lang')
    return saved === 'th' || saved === 'en' || saved === 'zh' ? saved : 'en'
  })

  const setLang = (nextLang) => {
    if (nextLang !== 'th' && nextLang !== 'en' && nextLang !== 'zh') return
    setLangState(nextLang)
    if (typeof window !== 'undefined') window.localStorage.setItem('lp_lang', nextLang)
  }

  const value = useMemo(() => ({ lang, setLang }), [lang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
