import { NavIcon } from './Icons'
import { useSite } from '../context/SiteContext'

type SidebarProps = {
  open: boolean
  activeHref: string
  onNavigate: () => void
}

export function Sidebar({ open, activeHref, onNavigate }: SidebarProps) {
  const site = useSite()

  return (
    <aside
      className={`sidebar${open ? ' is-open' : ''}`}
      id="sidebar"
      role="navigation"
      aria-label="เมนูหลัก"
    >
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          {site.hospital.shortName.slice(0, 2)}
          <span>{site.hospital.shortName.slice(2)}</span>
        </div>
        <p className="sidebar__motto" aria-label="Premium Care, Premium Service">
          <span>Premium Care</span>
          <span>Premium Service</span>
        </p>
        <div className="sidebar__tagline">{site.hospital.tagline}</div>
      </div>

      <nav className="sidebar__nav">
        <ul>
          {site.nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className={activeHref === item.href ? 'active' : undefined}
                onClick={onNavigate}
              >
                <span className="nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__hours">
          <strong>{site.hospital.name}</strong>
          <br />
          {site.hospital.hours[0]}
          <br />
          {site.hospital.hours[1]}
        </div>
      </div>
    </aside>
  )
}
