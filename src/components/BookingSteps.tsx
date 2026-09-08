import { useSite } from '../context/SiteContext'

export function BookingSteps() {
  const site = useSite()

  return (
    <section className="section builder" id="process">
      <div className="section__header reveal">
        <span className="section__label">ขั้นตอนเข้าพัก</span>
        <h2 className="section__title">เข้าห้องพิเศษได้ไม่ยุ่งยาก</h2>
        <p className="section__desc">
          เข้าห้องด้วย Fast Track ตรวจสิทธิ์และเคลมผ่าน iClaim ได้คล่อง
          ทีมเจ้าหน้าที่พร้อมช่วยทั้งผู้ป่วยและครอบครัว
        </p>
      </div>

      <div className="builder__layout">
        <div className="builder__steps">
          {site.steps.map((step, index) => (
            <div
              className={`builder-step reveal${index > 0 ? ` reveal-delay-${index}` : ''}`}
              key={step.num}
            >
              <div className="builder-step__num">{step.num}</div>
              <div>
                <h3 className="builder-step__title">{step.title}</h3>
                <p className="builder-step__text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="builder__preview reveal">
          <div className="builder__preview-bowl" aria-hidden="true">
            <div className="builder__preview-scoop1" />
            <div className="builder__preview-scoop2" />
            <div className="builder__preview-scoop3" />
          </div>
          <p className="builder__preview-text">ห้องพิเศษ / VIP</p>
          <p className="builder__preview-price">1,500 / 2,500 บาท/วัน</p>
          <p className="builder__preview-note">โทร {site.hospital.phone} · 24 ชั่วโมง</p>
        </div>
      </div>
    </section>
  )
}
