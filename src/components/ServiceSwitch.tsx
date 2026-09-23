import { NavIcon } from './Icons'

export type ServiceKey = 'vipward' | 'healthcheck'

const base = import.meta.env.BASE_URL

const services: { key: ServiceKey; label: string; icon: string; href: string }[] = [
  { key: 'vipward', label: 'ห้องพิเศษ', icon: 'rooms', href: base },
  { key: 'healthcheck', label: 'ตรวจสุขภาพ', icon: 'checkup', href: `${base}checkup` },
]

export function ServiceSwitch({ current }: { current: ServiceKey }) {
  return (
    <div className="service-switch" role="tablist" aria-label="เลือกบริการ">
      {services.map((service) => {
        const active = service.key === current
        return (
          <a
            key={service.key}
            href={service.href}
            role="tab"
            aria-selected={active}
            className={`service-switch__item${active ? ' is-active' : ''}`}
            onClick={(event) => {
              if (active) event.preventDefault()
            }}
          >
            <NavIcon name={service.icon} size={16} />
            {service.label}
          </a>
        )
      })}
    </div>
  )
}
