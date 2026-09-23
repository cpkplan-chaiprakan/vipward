import { useCallback, useEffect, useMemo, useState } from 'react'
import { Footer } from '../../components/Footer'
import { Sidebar } from '../../components/Sidebar'
import { useActiveSection } from '../../hooks/useActiveSection'
import { useReveal } from '../../hooks/useReveal'
import { fetchHealthcheckPackages } from './api'
import { healthcheckHours, healthcheckNav, healthcheckTagline } from './data'
import { HealthcheckHero } from './HealthcheckHero'
import { HealthcheckPackages } from './HealthcheckPackages'
import { HealthcheckRequestForm } from './HealthcheckRequestForm'
import { HealthcheckStatusLookup } from './HealthcheckStatusLookup'
import { HealthcheckSteps } from './HealthcheckSteps'
import type { HealthcheckPackage } from './types'
import './healthcheck.css'

export function HealthcheckApp() {
  const sectionIds = useMemo(() => healthcheckNav.map((item) => item.href.replace('#', '')), [])
  const activeId = useActiveSection(sectionIds)
  const [menuOpen, setMenuOpen] = useState(false)
  const [packages, setPackages] = useState<HealthcheckPackage[]>([])
  const [packagesState, setPackagesState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lookupRef, setLookupRef] = useState<{ ref: string; phone: string } | null>(null)

  useReveal(packagesState)

  useEffect(() => {
    document.title = 'ตรวจสุขภาพ | โรงพยาบาลไชยปราการ'
    let alive = true
    fetchHealthcheckPackages()
      .then((list) => {
        if (!alive) return
        setPackages(list)
        setPackagesState('ready')
      })
      .catch(() => {
        if (alive) setPackagesState('error')
      })
    return () => {
      alive = false
    }
  }, [])

  const choosePackage = useCallback((id: number) => {
    setSelectedId(id)
    document.getElementById('hc-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <button
        className={`hamburger${menuOpen ? ' is-active' : ''}`}
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
        style={{ display: menuOpen ? 'block' : 'none' }}
        onClick={closeMenu}
      />

      <Sidebar
        open={menuOpen}
        activeHref={`#${activeId}`}
        service="healthcheck"
        nav={healthcheckNav}
        tagline={healthcheckTagline}
        hours={healthcheckHours}
        onNavigate={() => {
          if (window.innerWidth <= 1024) closeMenu()
        }}
      />

      <main className="main">
        <HealthcheckHero packageCount={packages.length} />
        <HealthcheckPackages packages={packages} state={packagesState} onChoose={choosePackage} />
        <HealthcheckRequestForm
          packages={packages}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSubmitted={(ref, phone) => setLookupRef({ ref, phone })}
        />
        <HealthcheckStatusLookup prefill={lookupRef} />
        <HealthcheckSteps />
        <Footer />
      </main>
    </>
  )
}
