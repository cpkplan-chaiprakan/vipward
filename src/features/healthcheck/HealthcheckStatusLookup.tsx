import { Search } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { site } from '../../data/site'
import { formatThaiDateFull, formatThaiDateTime } from '../../lib/thaiDate'
import { lookupHealthcheckRequest } from './api'
import { periodLabel, statusMeta } from './data'
import type { HealthcheckPublicStatus } from './types'

type Props = {
  prefill: { ref: string; phone: string } | null
}

export function HealthcheckStatusLookup({ prefill }: Props) {
  const [ref, setRef] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<HealthcheckPublicStatus | null>(null)

  useEffect(() => {
    if (!prefill) return
    setRef(prefill.ref)
    setPhone(prefill.phone)
    setResult(null)
    setError('')
  }, [prefill])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setResult(null)
    if (!ref.trim() || !phone.trim()) {
      setError('กรอกรหัสคำขอและเบอร์โทรที่ใช้ตอนส่งคำขอ')
      return
    }
    setLoading(true)
    try {
      setResult(await lookupHealthcheckRequest(ref, phone))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ไม่พบคำขอ')
    } finally {
      setLoading(false)
    }
  }

  const meta = result ? statusMeta[result.status] : null
  const appointment = result?.confirmedDate
    ? `${formatThaiDateFull(result.confirmedDate)} · ${periodLabel[result.confirmedPeriod ?? result.preferredPeriod]}`
    : null

  return (
    <section className="section section--alt hc-status" id="hc-status">
      <div className="section__header reveal">
        <span className="section__label">เช็กสถานะคำขอ</span>
        <h2 className="section__title">ดูว่าได้วันนัดแล้วหรือยัง</h2>
        <p className="section__desc">ใช้รหัสคำขอ (เช่น HC-2609-1234) และเบอร์โทรที่กรอกไว้</p>
      </div>

      <div className="hc-status__layout">
        <form className="hc-lookup reveal" onSubmit={handleSubmit}>
          <label className="hc-field">
            <span>รหัสคำขอ</span>
            <input
              type="text"
              value={ref}
              onChange={(event) => setRef(event.target.value.toUpperCase())}
              placeholder="HC-0000-0000"
              maxLength={14}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
          <label className="hc-field">
            <span>เบอร์โทรศัพท์</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="08x-xxx-xxxx"
              maxLength={15}
            />
          </label>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            <Search size={18} aria-hidden="true" />
            {loading ? 'กำลังค้นหา…' : 'เช็กสถานะ'}
          </button>
          {error ? <p className="hc-lookup__error" role="alert">{error}</p> : null}
        </form>

        <div className="hc-status__result reveal reveal-delay-1" aria-live="polite">
          {result && meta ? (
            <div className={`hc-ticket hc-ticket--${meta.tone}`}>
              <div className="hc-ticket__head">
                <span className="hc-ticket__ref">{result.refCode}</span>
                <span className={`hc-badge hc-badge--${meta.tone}`}>{meta.label}</span>
              </div>
              <p className="hc-ticket__text">
                คุณ{result.firstName} · {meta.publicText}
              </p>
              <dl className="hc-ticket__meta">
                <div>
                  <dt>แพ็กเกจ</dt>
                  <dd>{result.packageName}</dd>
                </div>
                <div>
                  <dt>วันที่ขอ</dt>
                  <dd>
                    {formatThaiDateFull(result.preferredDate)} · {periodLabel[result.preferredPeriod]}
                  </dd>
                </div>
                {appointment && result.status !== 'rejected' && result.status !== 'cancelled' ? (
                  <div className="hc-ticket__appointment">
                    <dt>วันนัดตรวจ</dt>
                    <dd>{appointment}</dd>
                  </div>
                ) : null}
                {result.staffNote ? (
                  <div>
                    <dt>หมายเหตุจากเจ้าหน้าที่</dt>
                    <dd>{result.staffNote}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="hc-ticket__updated">อัปเดตล่าสุด {formatThaiDateTime(result.updatedAt)}</p>
            </div>
          ) : (
            <div className="hc-ticket hc-ticket--placeholder">
              <p>ผลการค้นหาจะแสดงที่นี่</p>
              <p className="hc-ticket__hint">
                ลืมรหัสคำขอ? โทร <a href={site.hospital.phoneHref}>053-870-444</a> แจ้งชื่อและเบอร์โทรได้เลย
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
