import { useSite } from '../context/SiteContext'

export function WhyVip() {
  const site = useSite()

  return (
    <section className="section section--alt loyalty" id="why">
      <div className="section__header reveal">
        <span className="section__label">ทำไมต้องห้องพิเศษ</span>
        <h2 className="section__title">พักฟื้นอย่างมีคุณภาพ ที่รพ.ไชยปราการ</h2>
        <p className="section__desc">
          ห้องพิเศษมอบความสะอาด ความเป็นส่วนตัว และการดูแลอบอุ่นจากทีมพยาบาล
          โดยครอบครัวได้อยู่ใกล้ชิด ห้องพิเศษทั่วไป 1,500 บาท/วัน ห้อง VIP 2,500 บาท/วัน
        </p>
      </div>

      <div className="loyalty__layout">
        <div className="loyalty__info reveal">
          <div className="loyalty__perks">
            {site.perks.map((perk) => (
              <div className="perk" key={perk.title}>
                <div className="perk__icon">✓</div>
                <p className="perk__text">
                  <strong>{perk.title}:</strong> {perk.text}
                </p>
              </div>
            ))}
          </div>

          <a href={site.hospital.phoneHref} className="btn btn--sage" style={{ marginTop: '2rem' }}>
            โทรสอบถามห้องว่าง
          </a>
        </div>

        <div className="stamp-card reveal reveal-delay-1">
          <div className="stamp-card__header">
            <span className="stamp-card__title">เหมาะกับผู้ใช้บริการ</span>
            <span className="stamp-card__count">ข้าราชการ ประกัน จ่ายเอง</span>
          </div>
          <div className="stamp-card__grid">
            {site.rights.map((item) => {
              const classes = [
                'stamp',
                item.filled ? 'stamp--filled' : '',
                item.reward ? 'stamp--reward' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div className={classes} key={item.label}>
                  {item.label}
                </div>
              )
            })}
          </div>
          <p className="stamp-card__footer">
            การใช้สิทธิ์ขึ้นกับข้อกำหนดของแต่ละสิทธิ์ เจ้าหน้าที่ช่วยตรวจสิทธิ์และเคลมให้ที่หอผู้ป่วย
          </p>
        </div>
      </div>
    </section>
  )
}
