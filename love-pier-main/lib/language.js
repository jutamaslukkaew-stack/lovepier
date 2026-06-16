import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
})

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('en')

  useEffect(() => {
    const saved = window.localStorage.getItem('lp_lang')
    if (saved === 'th' || saved === 'en' || saved === 'zh') setLangState(saved)
  }, [])

  const setLang = useCallback((nextLang) => {
    if (nextLang !== 'th' && nextLang !== 'en' && nextLang !== 'zh') return
    setLangState(nextLang)
    window.localStorage.setItem('lp_lang', nextLang)
  }, [])

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
