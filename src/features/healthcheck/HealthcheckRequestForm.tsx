import { CalendarDays, Check, CheckCircle2, Copy, IdCard, Phone, UtensilsCrossed } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { ThaiDatePicker } from '../../components/ThaiDatePicker'
import { site } from '../../data/site'
import { alertError, toastSuccess } from '../../lib/swal'
import { formatThaiDateFull, isoToday, shiftDays, thaiMonths, toBuddhistYear } from '../../lib/thaiDate'
import { submitHealthcheckRequest } from './api'
import { periodLabel } from './data'
import type { HealthcheckPackage, HealthcheckPeriod, HealthcheckSubmitResult } from './types'

type Props = {
  packages: HealthcheckPackage[]
  selectedId: number | null
  onSelect: (id: number) => void
  onSubmitted: (ref: string, phone: string) => void
}

const emptyForm = {
  fullName: '',
  phone: '',
  birthDay: '',
  birthMonth: '',
  birthYear: '',
  note: '',
  website: '',
}

function pad(n: number | string) {
  return String(n).padStart(2, '0')
}

export function HealthcheckRequestForm({ packages, selectedId, onSelect, onSubmitted }: Props) {
  const minDate = shiftDays(isoToday(), 1)
  const maxDate = shiftDays(isoToday(), 180)
  const [form, setForm] = useState(emptyForm)
  const [preferredDate, setPreferredDate] = useState(minDate)
  const [period, setPeriod] = useState<HealthcheckPeriod>('morning')
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<HealthcheckSubmitResult | null>(null)

  const packageId = selectedId ?? packages[0]?.id ?? 0
  const selectedPackage = packages.find((item) => item.id === packageId) ?? null

  useEffect(() => {
    if (selectedId !== null) setResult(null)
  }, [selectedId])

  const birthYears = useMemo(() => {
    const current = new Date().getFullYear()
    const years: number[] = []
    for (let y = current; y >= current - 100; y--) years.push(y)
    return years
  }, [])

  const update = (key: keyof typeof emptyForm) => (value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const phone = form.phone.replace(/\D/g, '')

    if (!packageId) {
      alertError('กรุณาเลือกแพ็กเกจ')
      return
    }
    if (form.fullName.trim().length < 4) {
      alertError('กรุณากรอกชื่อ-นามสกุล')
      return
    }
    if (!/^0\d{8,9}$/.test(phone)) {
      alertError('เบอร์โทรไม่ถูกต้อง', 'ใช้เบอร์ 9–10 หลัก ขึ้นต้นด้วย 0')
      return
    }
    const birthParts = [form.birthDay, form.birthMonth, form.birthYear]
    const birthFilled = birthParts.filter(Boolean).length
    if (birthFilled > 0 && birthFilled < 3) {
      alertError('กรอกวันเกิดให้ครบ', 'เลือกวัน เดือน ปี ให้ครบ หรือเว้นว่างทั้งหมด')
      return
    }
    if (!consent) {
      alertError('กรุณายินยอมให้เจ้าหน้าที่ติดต่อกลับ')
      return
    }

    const birthDate = birthFilled === 3 ? `${form.birthYear}-${pad(form.birthMonth)}-${pad(form.birthDay)}` : ''

    setSending(true)
    try {
      const response = await submitHealthcheckRequest({
        packageId,
        fullName: form.fullName.trim(),
        phone,
        birthDate,
        preferredDate,
        preferredPeriod: period,
        note: form.note.trim(),
        website: form.website,
      })
      setResult(response)
      onSubmitted(response.refCode, phone)
      setForm(emptyForm)
      setConsent(false)
      toastSuccess('ส่งคำขอเรียบร้อย')
      document.getElementById('hc-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (error) {
      alertError('ส่งคำขอไม่สำเร็จ', error instanceof Error ? error.message : undefined)
    } finally {
      setSending(false)
    }
  }

  async function copyRef() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.refCode)
      toastSuccess('คัดลอกรหัสคำขอแล้ว')
    } catch {
      /* บางเบราว์เซอร์ไม่อนุญาต ผู้ใช้จดเองได้ */
    }
  }

  return (
    <section className="section hc-request" id="hc-request">
      <div className="section__header reveal">
        <span className="section__label">ขอนัดตรวจสุขภาพ</span>
        <h2 className="section__title">กรอกข้อมูล แล้วรอเจ้าหน้าที่ยืนยัน</h2>
        <p className="section__desc">
          คำขอนี้ยังไม่ใช่การนัดหมาย เจ้าหน้าที่จะโทรกลับเพื่อยืนยันวันนัด หรือแจ้งวันใหม่หากคิวเต็ม
        </p>
      </div>

      {result ? (
        <div className="hc-success reveal is-visible" role="status">
          <CheckCircle2 size={44} strokeWidth={1.6} className="hc-success__icon" aria-hidden="true" />
          <h3>ส่งคำขอแล้ว</h3>
          <p>เก็บรหัสนี้ไว้เพื่อเช็กสถานะ และแจ้งเจ้าหน้าที่เมื่อมาตรวจ</p>
          <button type="button" className="hc-success__ref" onClick={copyRef} title="คัดลอกรหัสคำขอ">
            {result.refCode}
            <Copy size={18} aria-hidden="true" />
          </button>
          <dl className="hc-success__meta">
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
          </dl>
          <div className="hc-success__actions">
            <a href="#hc-status" className="btn btn--primary">
              เช็กสถานะคำขอ
            </a>
            <button type="button" className="btn btn--outline" onClick={() => setResult(null)}>
              ส่งคำขอใหม่
            </button>
          </div>
        </div>
      ) : (
        <div className="hc-request__layout">
        <form className="hc-form reveal" onSubmit={handleSubmit} noValidate>
          <fieldset className="hc-form__group">
            <legend>1. เลือกแพ็กเกจ</legend>
            {packages.length === 0 ? (
              <p className="hc-form__hint">ยังไม่มีแพ็กเกจให้เลือก กรุณาโทร {site.hospital.phone}</p>
            ) : (
              <div className="hc-choice-list">
                {packages.map((item) => (
                  <label className={`hc-choice${item.id === packageId ? ' is-active' : ''}`} key={item.id}>
                    <input
                      type="radio"
                      name="package"
                      value={item.id}
                      checked={item.id === packageId}
                      onChange={() => onSelect(item.id)}
                    />
                    <span className="hc-choice__name">{item.name}</span>
                    <span className="hc-choice__price">{item.price}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="hc-form__group">
            <legend>2. วันที่สะดวกมาตรวจ</legend>
            <div className="hc-form__row">
              <ThaiDatePicker value={preferredDate} onChange={setPreferredDate} min={minDate} max={maxDate} label="วันที่ต้องการ" />
              <div className="hc-segment" role="radiogroup" aria-label="ช่วงเวลา">
                {(Object.keys(periodLabel) as HealthcheckPeriod[]).map((key) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={period === key}
                    className={period === key ? 'is-active' : undefined}
                    key={key}
                    onClick={() => setPeriod(key)}
                  >
                    {periodLabel[key]}
                  </button>
                ))}
              </div>
            </div>
            <p className="hc-form__hint">ขอล่วงหน้าได้ไม่เกิน 6 เดือน วันนัดจริงขึ้นกับคิวของโรงพยาบาล</p>
          </fieldset>

          <fieldset className="hc-form__group">
            <legend>3. ข้อมูลผู้ตรวจ</legend>
            <div className="hc-form__grid">
              <label className="hc-field">
                <span>ชื่อ-นามสกุล *</span>
                <input
                  type="text"
                  autoComplete="name"
                  maxLength={150}
                  value={form.fullName}
                  onChange={(event) => update('fullName')(event.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                />
              </label>
              <label className="hc-field">
                <span>เบอร์โทรศัพท์ *</span>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={15}
                  value={form.phone}
                  onChange={(event) => update('phone')(event.target.value)}
                  placeholder="08x-xxx-xxxx"
                />
              </label>
              <div className="hc-field hc-field--wide">
                <span>วันเกิด (ไม่บังคับ)</span>
                <div className="hc-birth">
                  <select value={form.birthDay} onChange={(event) => update('birthDay')(event.target.value)} aria-label="วันเกิด">
                    <option value="">วัน</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <select value={form.birthMonth} onChange={(event) => update('birthMonth')(event.target.value)} aria-label="เดือนเกิด">
                    <option value="">เดือน</option>
                    {thaiMonths.map((name, index) => (
                      <option key={name} value={index + 1}>{name}</option>
                    ))}
                  </select>
                  <select value={form.birthYear} onChange={(event) => update('birthYear')(event.target.value)} aria-label="ปีเกิด พ.ศ.">
                    <option value="">ปี พ.ศ.</option>
                    {birthYears.map((year) => (
                      <option key={year} value={year}>{toBuddhistYear(year)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="hc-field hc-field--wide">
                <span>หมายเหตุถึงเจ้าหน้าที่ (ไม่บังคับ)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.note}
                  onChange={(event) => update('note')(event.target.value)}
                  placeholder="เช่น โรคประจำตัว ยาที่ใช้ประจำ หรือเวลาที่สะดวกให้โทรกลับ"
                />
              </label>
              <label className="hc-honeypot" aria-hidden="true">
                เว็บไซต์
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(event) => update('website')(event.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <label className="hc-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>ยินยอมให้โรงพยาบาลไชยปราการใช้ข้อมูลนี้เพื่อติดต่อนัดหมายตรวจสุขภาพเท่านั้น</span>
          </label>

          <div className="hc-form__submit">
            <button type="submit" className="btn btn--primary" disabled={sending || packages.length === 0}>
              {sending ? 'กำลังส่ง…' : 'ส่งคำขอนัดตรวจ'}
            </button>
            <span>หรือโทร <a href={site.hospital.phoneHref}>053-870-444</a></span>
          </div>
        </form>

        <aside className="hc-summary reveal" aria-label="สรุปคำขอ">
          <div className="hc-summary__card">
            <span className="hc-summary__label">แพ็กเกจที่เลือก</span>
            {selectedPackage ? (
              <>
                <h3 className="hc-summary__name">{selectedPackage.name}</h3>
                <p className="hc-summary__price">{selectedPackage.price}</p>
                {selectedPackage.description && <p className="hc-summary__desc">{selectedPackage.description}</p>}
                {selectedPackage.items.length > 0 && (
                  <ul className="hc-summary__items">
                    {selectedPackage.items.map((item) => (
                      <li key={item}>
                        <Check size={15} strokeWidth={2.4} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="hc-summary__desc">ยังไม่ได้เลือกแพ็กเกจ</p>
            )}
            <div className="hc-summary__date">
              <CalendarDays size={18} aria-hidden="true" />
              <div>
                <span>วันที่ขอ</span>
                <strong>
                  {formatThaiDateFull(preferredDate)} · {periodLabel[period]}
                </strong>
              </div>
            </div>
          </div>

          <div className="hc-summary__tips">
            <h4>เตรียมตัวก่อนมาตรวจ</h4>
            <ul>
              <li>
                <UtensilsCrossed size={16} aria-hidden="true" />
                ถ้ามีตรวจน้ำตาลหรือไขมัน งดอาหารและเครื่องดื่ม (ยกเว้นน้ำเปล่า) 8 ชั่วโมง
              </li>
              <li>
                <IdCard size={16} aria-hidden="true" />
                นำบัตรประชาชนและรหัสคำขอมาด้วย
              </li>
              <li>
                <Phone size={16} aria-hidden="true" />
                เจ้าหน้าที่จะโทรยืนยันวันนัดจากเบอร์ <a href={site.hospital.phoneHref}>053-870-444</a>
              </li>
            </ul>
          </div>
        </aside>
        </div>
      )}
    </section>
  )
}
