import { site } from '../../data/site'
import { healthcheckSteps } from './data'

export function HealthcheckSteps() {
  return (
    <section className="section builder" id="hc-steps">
      <div className="section__header reveal">
        <span className="section__label">ขั้นตอนการตรวจ</span>
        <h2 className="section__title">จากคำขอ ถึงวันตรวจจริง</h2>
        <p className="section__desc">ส่งคำขอได้ตลอดเวลา เจ้าหน้าที่ยืนยันวันนัดให้ทางโทรศัพท์</p>
      </div>

      <div className="builder__layout">
        <div className="builder__steps">
          {healthcheckSteps.map((step, index) => (
            <div className={`builder-step reveal${index > 0 ? ` reveal-delay-${index}` : ''}`} key={step.num}>
              <div className="builder-step__num">{step.num}</div>
              <div>
                <h3 className="builder-step__title">{step.title}</h3>
                <p className="builder-step__text">{step.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="builder__preview hc-steps__card reveal">
          <div className="builder__preview-bowl" aria-hidden="true">
            <div className="builder__preview-scoop1" />
            <div className="builder__preview-scoop2" />
            <div className="builder__preview-scoop3" />
          </div>
          <p className="builder__preview-text">สิ่งที่ต้องนำมา</p>
          <p className="builder__preview-price">บัตรประชาชน + รหัสคำขอ</p>
          <p className="builder__preview-note">สอบถาม {site.hospital.phone}</p>
        </div>
      </div>
    </section>
  )
}
