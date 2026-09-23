import { Check } from 'lucide-react'
import { site } from '../../data/site'
import type { HealthcheckPackage } from './types'

type Props = {
  packages: HealthcheckPackage[]
  state: 'loading' | 'ready' | 'error'
  onChoose: (id: number) => void
}

export function HealthcheckPackages({ packages, state, onChoose }: Props) {
  return (
    <section className="section section--alt" id="hc-packages">
      <div className="section__header reveal">
        <span className="section__label">แพ็กเกจตรวจสุขภาพ</span>
        <h2 className="section__title">เลือกแพ็กเกจที่เหมาะกับคุณ</h2>
        <p className="section__desc">
          รายการตรวจและราคาอาจปรับตามดุลยพินิจของแพทย์ สอบถามรายละเอียดเพิ่มเติมได้ที่ {site.hospital.phone}
        </p>
      </div>

      {state === 'loading' ? (
        <div className="hc-packages">
          {[0, 1, 2].map((key) => (
            <div className="hc-package hc-package--skeleton" key={key} aria-hidden="true" />
          ))}
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="hc-empty">
          โหลดแพ็กเกจไม่สำเร็จ กรุณารีเฟรชหน้า หรือโทร <a href={site.hospital.phoneHref}>053-870-444</a>
        </div>
      ) : null}

      {state === 'ready' && packages.length === 0 ? (
        <div className="hc-empty">ยังไม่มีแพ็กเกจเปิดให้จอง กรุณาโทรสอบถาม {site.hospital.phone}</div>
      ) : null}

      {state === 'ready' && packages.length > 0 ? (
        <div className="hc-packages">
          {packages.map((item, index) => (
            <article
              className={`hc-package reveal${index > 0 ? ` reveal-delay-${Math.min(index, 4)}` : ''}${item.tag ? ' is-featured' : ''}`}
              key={item.id}
            >
              {item.tag ? <span className="hc-package__tag">{item.tag}</span> : null}
              <h3 className="hc-package__name">{item.name}</h3>
              {item.description ? <p className="hc-package__desc">{item.description}</p> : null}
              {item.items.length > 0 ? (
                <ul className="hc-package__items">
                  {item.items.map((line) => (
                    <li key={line}>
                      <Check size={16} strokeWidth={2.2} aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="hc-package__foot">
                <div className="hc-package__price">
                  {item.price}
                  {item.priceNote ? <small> {item.priceNote}</small> : null}
                </div>
                <button type="button" className="btn btn--primary hc-package__cta" onClick={() => onChoose(item.id)}>
                  เลือกแพ็กเกจนี้
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
