import { createContext, useContext, type ReactNode, useEffect, useState } from 'react'
import { fetchCatalog } from '../api/catalog'
import { site as fallbackSite } from '../data/site'
import type { SiteContent } from '../types'

type SiteContextValue = {
  site: SiteContent
  source: 'mysql' | 'fallback'
}

const SiteContext = createContext<SiteContextValue>({
  site: fallbackSite,
  source: 'fallback',
})

export function SiteProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SiteContextValue>({
    site: fallbackSite,
    source: 'fallback',
  })

  useEffect(() => {
    let alive = true

    fetchCatalog().then((catalog) => {
      if (!alive) return
      setValue(catalog)
    })

    return () => {
      alive = false
    }
  }, [])

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  return useContext(SiteContext).site
}
