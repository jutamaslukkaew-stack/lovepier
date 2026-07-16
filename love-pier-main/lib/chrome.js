// Lets a page (e.g. /delivery's OrderFlow) tell Layout to hide the site nav
// and footer so a guided flow can feel like a dedicated full-screen app
// view instead of a webpage with marketing chrome around it.
import { createContext, useContext, useState } from 'react'

const ChromeContext = createContext({ hidden: false, setHidden: () => {} })

export function ChromeProvider({ children }) {
  const [hidden, setHidden] = useState(false)
  return <ChromeContext.Provider value={{ hidden, setHidden }}>{children}</ChromeContext.Provider>
}

export function useChrome() {
  return useContext(ChromeContext)
}
