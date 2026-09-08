import { useMemo, useState } from 'react'
import { Amenities } from './components/Amenities'
import { AdminPage } from './components/AdminPage'
import { BookingSteps } from './components/BookingSteps'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { RoomPackages } from './components/RoomPackages'
import { RoomTypes } from './components/RoomTypes'
import { Sidebar } from './components/Sidebar'
import { WhyVip } from './components/WhyVip'
import { SiteProvider, useSite } from './context/SiteContext'
import { useActiveSection } from './hooks/useActiveSection'
import { useReveal } from './hooks/useReveal'

function AppShell() {
  const site = useSite()
  const sectionIds = useMemo(() => site.nav.map((item) => item.href.replace('#', '')), [site.nav])
  const activeId = useActiveSection(sectionIds)
  const [menuOpen, setMenuOpen] = useState(false)

  useReveal(site.rooms)

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <button
        className={`hamburger${menuOpen ? ' is-active' : ''}`}
        id="hamburger"
        aria-label="เปิดเมนูนำทาง"
        aria-expanded={menuOpen}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <div className="hamburger__lines">
          <span />
          <span />
          <span />
        </div>
      </button>

      <div
        className={`sidebar-overlay${menuOpen ? ' is-visible' : ''}`}
        id="sidebarOverlay"
        style={{ display: menuOpen ? 'block' : 'none' }}
        onClick={closeMenu}
      />

      <Sidebar
        open={menuOpen}
        activeHref={`#${activeId}`}
        onNavigate={() => {
          if (window.innerWidth <= 1024) closeMenu()
        }}
      />

      <main className="main">
        <Hero />
        <RoomTypes />
        <BookingSteps />
        <RoomPackages packages={site.packages} />
        <Amenities />
        <WhyVip />
        <Footer />
      </main>
    </>
  )
}

export default function App() {
  const isAdmin = /\/admin\/?$/.test(window.location.pathname)

  if (isAdmin) {
    return <AdminPage />
  }

  return (
    <SiteProvider>
      <AppShell />
    </SiteProvider>
  )
}
