import { useEffect, useState } from 'react'
import { AmenityTabIcon } from './Icons'
import { useSite } from '../context/SiteContext'

export function Amenities() {
  const site = useSite()
  const [activeId, setActiveId] = useState(site.amenities[0]?.id ?? 'privacy')
  const active = site.amenities.find((item) => item.id === activeId) ?? site.amenities[0]

  useEffect(() => {
    if (!site.amenities.some((item) => item.id === activeId)) {
      setActiveId(site.amenities[0]?.id ?? 'privacy')
    }
  }, [site.amenities, activeId])

  return (
    <section className="section" id="amenities">
      <div className="section__header reveal">
        <span className="section__label">สิ่งอำนวยความสะดวก</span>
        <h2 className="section__title">มากกว่าห้องนอน คือพื้นที่พักฟื้น</h2>
        <p className="section__desc">
          ทุกห้องพิเศษมีทีวี ไวไฟ ตู้เย็น โซฟา ระบบเรียกพยาบาล 24 ชั่วโมง
          และพื้นที่ให้ครอบครัวได้อยู่ใกล้ผู้ป่วย
        </p>
      </div>

      <div className="seasonal-tabs reveal" role="tablist">
        {site.amenities.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`seasonal-tab${item.id === activeId ? ' is-active' : ''}`}
            data-season={item.id}
            role="tab"
            aria-selected={item.id === activeId}
            aria-controls={`panel-${item.id}`}
            onClick={() => setActiveId(item.id)}
          >
            <span className="seasonal-tab__icon" aria-hidden="true">
              <AmenityTabIcon name={item.id} />
            </span>
            {item.tabLabel}
          </button>
        ))}
      </div>

      {active ? (
        <div className="seasonal-panels reveal">
          <div className="seasonal-panel is-active" id={`panel-${active.id}`} role="tabpanel">
            <div className={`seasonal-panel__visual seasonal-panel__visual--${active.tone}`}>
              <span className="seasonal-panel__badge">{active.badge}</span>
            </div>
            <div className="seasonal-panel__details">
              <span className="seasonal-panel__season-label">{active.seasonLabel}</span>
              <h3 className="seasonal-panel__name">{active.name}</h3>
              <p className="seasonal-panel__desc">{active.description}</p>
              <div className="seasonal-panel__meta">
                {active.tags.map((tag) => (
                  <span className="seasonal-panel__meta-tag" key={tag.text}>
                    <span>{tag.icon}</span> {tag.text}
                  </span>
                ))}
              </div>
              <a href="#process" className="btn btn--primary seasonal-panel__cta">
                สอบถามรายละเอียด
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
