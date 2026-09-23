import {
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ThaiDatePicker } from '../../../components/ThaiDatePicker'
import { alertError, confirmAction, toastError, toastSuccess } from '../../../lib/swal'
import { formatThaiDate, formatThaiDateShort, formatThaiDateTime, isoToday } from '../../../lib/thaiDate'
import { fetchAdminHealthcheckRequests, updateAdminHealthcheckRequest } from '../../healthcheck/api'
import { periodLabel, statusMeta } from '../../healthcheck/data'
import type {
  HealthcheckAdminAction,
  HealthcheckAdminRequest,
  HealthcheckCounts,
  HealthcheckPeriod,
} from '../../healthcheck/types'

const filters: { value: string; label: string }[] = [
  { value: 'active', label: 'ที่ต้องดูแล' },
  { value: 'pending', label: 'รอยืนยัน' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'rescheduled', label: 'นัดวันใหม่' },
  { value: 'completed', label: 'ตรวจแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธ' },
  { value: 'cancelled', label: 'ยกเลิก' },
  { value: 'all', label: 'ทั้งหมด' },
]

function formatPhone(phone: string) {
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
  if (phone.length === 9) return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`
  return phone
}

function ageFrom(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T12:00:00`)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age >= 0 ? age : null
}

function RequestEditor({
  request,
  onClose,
  onSaved,
}: {
  request: HealthcheckAdminRequest
  onClose: () => void
  onSaved: (request: HealthcheckAdminRequest, counts: HealthcheckCounts) => void
}) {
  const today = isoToday()
  const initialDate = request.confirmedDate ?? (request.preferredDate < today ? today : request.preferredDate)
  const [date, setDate] = useState(initialDate)
  const [period, setPeriod] = useState<HealthcheckPeriod>(request.confirmedPeriod ?? request.preferredPeriod)
  const [note, setNote] = useState(request.staffNote ?? '')
  const [saving, setSaving] = useState(false)

  const isOpen = ['pending', 'confirmed', 'rescheduled'].includes(request.status)
  const isScheduled = request.status === 'confirmed' || request.status === 'rescheduled'
  const sameAsRequested = date === request.preferredDate && period === request.preferredPeriod
  const age = ageFrom(request.birthDate)

  async function run(action: HealthcheckAdminAction, confirmText?: { title: string; text: string; danger?: boolean }) {
    if (action === 'reject' && !note.trim()) {
      void toastError('ใส่เหตุผลในช่องหมายเหตุก่อน คนไข้จะเห็นข้อความนี้')
      return
    }
    if (confirmText) {
      const answer = await confirmAction({
        title: confirmText.title,
        text: confirmText.text,
        confirmText: 'ยืนยัน',
        danger: confirmText.danger,
      })
      if (!answer.isConfirmed) return
    }
    setSaving(true)
    try {
      const result = await updateAdminHealthcheckRequest({
        id: request.id,
        action,
        date,
        period,
        note: note.trim(),
      })
      void toastSuccess(`${request.refCode} · ${statusMeta[result.request.status].label}`)
      onSaved(result.request, result.counts)
    } catch (err) {
      void alertError('บันทึกไม่สำเร็จ', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    void run('confirm', {
      title: sameAsRequested ? 'ยืนยันวันนัดตามที่ขอ?' : 'นัดวันใหม่ให้คนไข้?',
      text: `${request.fullName} · ${formatThaiDate(date)} ${periodLabel[period]} — อย่าลืมโทรแจ้งคนไข้ ${formatPhone(request.phone)}`,
    })
  }

  return (
    <div className="admin-editor-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="admin-editor hc-admin-editor" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-editor__visual hc-admin-editor__visual">
          <span>{request.refCode}</span>
          <h2>{request.fullName}</h2>
          <small>
            {statusMeta[request.status].label} · ส่งคำขอ {formatThaiDateTime(request.createdAt)}
            {request.handledBy ? ` · ล่าสุดโดย ${request.handledBy}` : ''}
          </small>
        </div>

        <div className="admin-editor__body">
          <dl className="hc-admin-detail">
            <div>
              <dt>เบอร์โทร</dt>
              <dd>
                <a href={`tel:${request.phone}`} className="hc-admin-tel">
                  <Phone size={15} /> {formatPhone(request.phone)}
                </a>
              </dd>
            </div>
            <div>
              <dt>แพ็กเกจ</dt>
              <dd>{request.packageName}</dd>
            </div>
            <div>
              <dt>วันที่คนไข้ขอ</dt>
              <dd>{formatThaiDate(request.preferredDate)} · {periodLabel[request.preferredPeriod]}</dd>
            </div>
            {request.birthDate ? (
              <div>
                <dt>วันเกิด</dt>
                <dd>{formatThaiDate(request.birthDate)}{age !== null ? ` (${age} ปี)` : ''}</dd>
              </div>
            ) : null}
            {request.note ? (
              <div className="hc-admin-detail__note">
                <dt>หมายเหตุจากคนไข้</dt>
                <dd>{request.note}</dd>
              </div>
            ) : null}
          </dl>

          {isOpen ? (
            <div className="hc-admin-schedule">
              <h3>{isScheduled ? 'แก้ไขวันนัด' : 'กำหนดวันนัด'}</h3>
              <div className="admin-field">
                <span>วันนัดตรวจ</span>
                <ThaiDatePicker value={date} onChange={setDate} min={today} />
              </div>
              <div className="hc-segment hc-admin-segment" role="radiogroup" aria-label="ช่วงเวลา">
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
              <p className={`hc-admin-schedule__hint${sameAsRequested ? '' : ' is-changed'}`}>
                {sameAsRequested ? 'ตรงกับวันที่คนไข้ขอ → สถานะ “ยืนยันแล้ว”' : 'ต่างจากวันที่คนไข้ขอ → สถานะ “นัดวันใหม่”'}
              </p>
            </div>
          ) : null}

          <label className="admin-field">
            <span>หมายเหตุถึงคนไข้ (แสดงในหน้าเช็กสถานะ)</span>
            <textarea
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="เช่น งดอาหารหลังเที่ยงคืน มาถึงก่อน 08:00 น. ที่จุดลงทะเบียน"
            />
          </label>

          <div className="admin-editor__actions hc-admin-actions">
            {isOpen ? (
              <>
                <button
                  type="button"
                  className="btn admin-btn--danger"
                  disabled={saving}
                  onClick={() =>
                    void run('reject', {
                      title: 'ปฏิเสธคำขอนี้?',
                      text: 'คนไข้จะเห็นหมายเหตุที่เขียนไว้ในหน้าเช็กสถานะ',
                      danger: true,
                    })
                  }
                >
                  <XCircle size={16} /> ปฏิเสธ
                </button>
                {isScheduled ? (
                  <button
                    type="button"
                    className="btn hc-admin-btn--done"
                    disabled={saving}
                    onClick={() => void run('complete', { title: 'บันทึกว่าตรวจเรียบร้อย?', text: `${request.fullName} มาตรวจแล้ว` })}
                  >
                    <CheckCircle2 size={16} /> ตรวจแล้ว
                  </button>
                ) : null}
                <span className="admin-editor__spacer" />
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  <CalendarCheck size={16} />
                  {saving ? 'กำลังบันทึก…' : sameAsRequested ? 'ยืนยันวันนัด' : 'นัดวันใหม่'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn admin-btn--ghost"
                  disabled={saving}
                  onClick={() => void run('reopen', { title: 'เปิดคำขออีกครั้ง?', text: 'สถานะจะกลับเป็น “รอยืนยัน” และล้างวันนัดเดิม' })}
                >
                  <RotateCcw size={16} /> เปิดคำขอใหม่
                </button>
                <span className="admin-editor__spacer" />
                <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void run('note')}>
                  บันทึกหมายเหตุ
                </button>
              </>
            )}
          </div>

          {isOpen ? (
            <div className="hc-admin-footer-actions">
              <button type="button" disabled={saving} onClick={() => void run('note')}>
                บันทึกหมายเหตุอย่างเดียว
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void run('cancel', { title: 'ยกเลิกคำขอนี้?', text: 'ใช้เมื่อคนไข้แจ้งยกเลิกเอง', danger: true })
                }
              >
                คนไข้ขอยกเลิก
              </button>
              <button type="button" className="hc-admin-footer-actions__close" onClick={onClose}>
                ปิด
              </button>
            </div>
          ) : null}
        </div>
      </form>
    </div>
  )
}

export function AdminHealthcheckRequests({ onCounts }: { onCounts: (counts: HealthcheckCounts) => void }) {
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState<HealthcheckAdminRequest[]>([])
  const [counts, setCounts] = useState<HealthcheckCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<HealthcheckAdminRequest | null>(null)

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      setError('')
      try {
        const data = await fetchAdminHealthcheckRequests(filter)
        setRequests(data.requests)
        setCounts(data.counts)
        onCounts(data.counts)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'โหลดคำขอไม่สำเร็จ'
        setError(message)
        if (!quiet) void toastError(message)
      } finally {
        setLoading(false)
      }
    },
    [filter, onCounts],
  )

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(true), 60_000)
    return () => window.clearInterval(timer)
  }, [load])

  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return requests
    const digits = keyword.replace(/\D/g, '')
    return requests.filter(
      (item) =>
        item.fullName.toLowerCase().includes(keyword) ||
        item.refCode.toLowerCase().includes(keyword) ||
        (digits.length >= 3 && item.phone.includes(digits)),
    )
  }, [requests, search])

  const upcoming = (counts?.confirmed ?? 0) + (counts?.rescheduled ?? 0)

  return (
    <>
      <section className="admin-stats hc-admin-stats">
        <article className="admin-stat hc-admin-stat--pending">
          <Hourglass />
          <span><small>รอยืนยัน</small><strong>{counts?.pending ?? '–'}</strong></span>
        </article>
        <article className="admin-stat hc-admin-stat--today">
          <CalendarClock />
          <span><small>นัดตรวจวันนี้</small><strong>{counts?.today ?? '–'}</strong></span>
        </article>
        <article className="admin-stat hc-admin-stat--upcoming">
          <CalendarCheck />
          <span><small>นัดแล้ว (รอมาตรวจ)</small><strong>{counts ? upcoming : '–'}</strong></span>
        </article>
        <article className="admin-stat hc-admin-stat--done">
          <CheckCircle2 />
          <span><small>ตรวจเรียบร้อย</small><strong>{counts?.completed ?? '–'}</strong></span>
        </article>
      </section>

      <section className="admin-board">
        <div className="admin-board__heading hc-admin-heading">
          <div>
            <h2>คำขอตรวจสุขภาพ</h2>
            <p>กดที่คำขอเพื่อยืนยันวันนัด นัดวันใหม่ หรือปฏิเสธ · อัปเดตอัตโนมัติทุก 1 นาที</p>
          </div>
          <button className="hc-admin-refresh" type="button" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> อัปเดต
          </button>
        </div>

        <div className="hc-admin-toolbar">
          <div className="hc-admin-filters" role="tablist" aria-label="กรองสถานะ">
            {filters.map((item) => {
              const count =
                item.value === 'active'
                  ? counts
                    ? counts.pending + upcoming
                    : null
                  : item.value === 'all'
                    ? null
                    : counts?.[item.value as keyof HealthcheckCounts] ?? null
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === item.value}
                  className={filter === item.value ? 'is-active' : undefined}
                  key={item.value}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                  {count ? <span>{count}</span> : null}
                </button>
              )
            })}
          </div>
          <label className="hc-admin-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อ เบอร์ หรือรหัสคำขอ"
            />
          </label>
        </div>

        {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

        {visible.length === 0 && !loading ? (
          <div className="hc-admin-empty">
            <ClipboardList size={34} strokeWidth={1.5} />
            <p>{search ? 'ไม่พบคำขอที่ค้นหา' : 'ยังไม่มีคำขอในสถานะนี้'}</p>
          </div>
        ) : (
          <div className={`hc-admin-list${loading ? ' is-loading' : ''}`}>
            {visible.map((item) => {
              const meta = statusMeta[item.status]
              const scheduled = item.confirmedDate && (item.status === 'confirmed' || item.status === 'rescheduled' || item.status === 'completed')
              return (
                <button type="button" className={`hc-admin-row hc-admin-row--${meta.tone}`} key={item.id} onClick={() => setSelected(item)}>
                  <span className="hc-admin-row__main">
                    <small>{item.refCode}</small>
                    <strong>{item.fullName}</strong>
                    <em>{item.packageName}</em>
                  </span>
                  <span className="hc-admin-row__phone">
                    <Phone size={14} /> {formatPhone(item.phone)}
                  </span>
                  <span className="hc-admin-row__date">
                    <small>{scheduled ? 'วันนัด' : 'วันที่ขอ'}</small>
                    <strong>
                      {formatThaiDateShort(scheduled ? item.confirmedDate! : item.preferredDate)}
                    </strong>
                    <em>{periodLabel[(scheduled ? item.confirmedPeriod : null) ?? item.preferredPeriod]}</em>
                  </span>
                  <span className="hc-admin-row__status">
                    <span className={`hc-badge hc-badge--${meta.tone}`}>{meta.label}</span>
                    <time>{formatThaiDateTime(item.createdAt)}</time>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selected ? (
        <RequestEditor
          key={selected.id}
          request={selected}
          onClose={() => setSelected(null)}
          onSaved={(updated, nextCounts) => {
            setSelected(null)
            setCounts(nextCounts)
            onCounts(nextCounts)
            setRequests((list) => list.map((item) => (item.id === updated.id ? updated : item)))
            void load(true)
          }}
        />
      ) : null}
    </>
  )
}
