import { useEffect, useState } from 'react'

export function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0] ?? '')

  useEffect(() => {
    const onScroll = () => {
      const marker = window.scrollY + 120
      let current = ids[0] ?? ''

      for (const id of ids) {
        const section = document.getElementById(id)
        if (!section) continue
        const top = section.offsetTop
        const bottom = top + section.offsetHeight
        if (marker >= top && marker < bottom) {
          current = id
        }
      }

      setActiveId(current)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids])

  return activeId
}
