import type { RoomPackage } from '../types'

type RoomPackagesProps = {
  packages: RoomPackage[]
}

export function RoomPackages({ packages }: RoomPackagesProps) {
  return (
    <section className="section section--alt" id="packages">
      <div className="section__header reveal">
        <span className="section__label">อัตราค่าห้องพิเศษ</span>
        <h2 className="section__title">เลือกห้องตามความต้องการ</h2>
        <p className="section__desc">
          ห้องพิเศษทั่วไป 1,500 บาท/วัน และห้องพิเศษ VIP (ห้อง 6) 2,500 บาท/วัน
          ห้องว่างขึ้นกับวันที่เข้าพัก กรุณาสอบถามเจ้าหน้าที่เพื่อยืนยันห้อง
        </p>
      </div>

      <div className="catering__grid">
        {packages.map((item, index) => (
          <div
            className={`cart-card reveal${index > 0 ? ` reveal-delay-${index}` : ''}`}
            key={item.id}
          >
            <div className={`cart-card__visual cart-card__visual--${item.tone}`}>
              <span className="cart-card__visual-label">{item.label}</span>
            </div>
            <div className="cart-card__body">
              <h3 className="cart-card__name">{item.name}</h3>
              <p className="cart-card__desc">{item.description}</p>
              <div className="cart-card__details">
                {item.details.map((detail) => (
                  <span className="cart-card__detail" key={detail}>
                    {detail}
                  </span>
                ))}
              </div>
              <div className="cart-card__price">
                {item.price} <small>{item.priceNote}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
