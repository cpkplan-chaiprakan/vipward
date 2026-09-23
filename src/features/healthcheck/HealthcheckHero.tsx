import { HospitalSeal } from '../../components/HospitalSeal'
import { site } from '../../data/site'

export function HealthcheckHero({ packageCount }: { packageCount: number }) {
  return (
    <section className="hero hc-hero" id="hc-hero">
      <HospitalSeal />

      <div className="hero__content">
        <div className="hero__badge reveal">ตรวจสุขภาพ รพ.ไชยปราการ</div>
        <h1 className="hero__title reveal reveal-delay-1">
          รู้ทันสุขภาพ
          <br />
          <em>นัดตรวจล่วงหน้าได้ง่าย ๆ</em>
        </h1>
        <p className="hero__subtitle reveal reveal-delay-2">
          เลือกแพ็กเกจตรวจสุขภาพ{packageCount > 0 ? ` ${packageCount} แบบ` : ''} ระบุวันที่สะดวก
          แล้วรอเจ้าหน้าที่โทรยืนยันวันนัด ติดตามสถานะคำขอได้เองด้วยรหัสคำขอ
        </p>
        <div className="hero__actions reveal reveal-delay-3">
          <a href="#hc-request" className="btn btn--primary">
            ขอนัดตรวจสุขภาพ
          </a>
          <a href="#hc-status" className="btn btn--outline">
            เช็กสถานะคำขอ
          </a>
        </div>
        <p className="hc-hero__call reveal reveal-delay-4">
          สอบถามเพิ่มเติม <a href={site.hospital.phoneHref}>053-870-444</a>
        </p>
      </div>

      <div className="hero__deco hc-hero__deco" aria-hidden="true">
        <div className="hc-hero__pulse">
          <svg viewBox="0 0 220 80" fill="none">
            <path
              d="M0 40h58l12-22 16 46 16-58 14 50 10-16h94"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="scoop hc-orb hc-orb--blue" />
        <div className="scoop hc-orb hc-orb--sky" />
        <div className="scoop hc-orb hc-orb--mist" />
      </div>
    </section>
  )
}
