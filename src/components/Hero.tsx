import { useSite } from '../context/SiteContext'

export function Hero() {
  const site = useSite()

  return (
    <section className="hero" id="hero">
      <div className="hero__content">
        <div className="hero__badge reveal">ห้องพิเศษ รพ.ไชยปราการ</div>
        <h1 className="hero__title reveal reveal-delay-1">
          พักฟื้นอย่างสงบ
          <br />
          <em>ดูแลทั้งผู้ป่วยและครอบครัว</em>
        </h1>
        <p className="hero__subtitle reveal reveal-delay-2">
          ห้องพิเศษ 12 ห้อง กว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา
          และทีมพยาบาลดูแลตลอด 24 ชั่วโมง ห้องพิเศษทั่วไป 1,500 บาท/วัน
          ห้อง VIP (ห้อง 6) 2,500 บาท/วัน
        </p>
        <div className="hero__actions reveal reveal-delay-3">
          <a href="#rooms" className="btn btn--primary">
            เช็กห้องว่าง
          </a>
          <a href={site.hospital.phoneHref} className="btn btn--outline">
            สอบถามเข้าพัก
          </a>
        </div>
      </div>

      <div className="hero__deco" aria-hidden="true">
        <div className="scoop scoop--strawberry">
          <div className="scoop--highlight" />
        </div>
        <div className="scoop scoop--mint">
          <div className="scoop--highlight" />
        </div>
        <div className="scoop scoop--vanilla">
          <div className="scoop--highlight" />
        </div>
      </div>
    </section>
  )
}
