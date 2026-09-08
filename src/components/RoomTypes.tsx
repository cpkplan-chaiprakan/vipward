import {
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  ListChecks,
  Phone,
  RefreshCw,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAvailability,
  fetchAvailabilityMonth,
  roomStatusMeta,
  isVipRoom,
  roomDailyRateLabel,
  type AvailabilityRoom,
  type CalendarDay,
  type RoomStatus,
} from '../api/availability'
import { vipSwal } from '../lib/swal'
import {
  formatThaiDateFull,
  formatThaiDateTime,
  formatThaiMonth,
  isoToday,
  shiftMonths,
  thaiWeekdaysShort,
} from '../lib/thaiDate'

const statusIcons: Record<Exclude<RoomStatus, 'available'>, typeof Clock3> = {
  reserved: Clock3,
  occupied: DoorOpen,
  cleaning: Sparkles,
  maintenance: Wrench,
}

/* ---------- โมดัลรายห้อง (SweetAlert2) ---------- */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const statusSvg: Record<RoomStatus, string> = {
  available:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>',
  reserved:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  occupied:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>',
  cleaning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
  maintenance:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
}

function roomListHtml(rooms: AvailabilityRoom[]) {
  const availableCount = rooms.filter((room) => room.status === 'available').length
  const items = rooms
    .map((room) => {
      const meta = roomStatusMeta[room.status]
      const updated = formatThaiDateTime(room.updatedAt)
      const sub =
        room.status === 'available'
          ? updated
            ? `ว่างพร้อมเข้าพัก · อัปเดต ${updated}`
            : 'ว่างพร้อมเข้าพัก'
          : updated
            ? `อัปเดต ${updated}`
            : meta.label
      const vip = isVipRoom(room)
      return `
        <li class="swal-room swal-room--${room.status}${vip ? ' swal-room--vip' : ''}">
          <span class="swal-room__icon">${statusSvg[room.status]}</span>
          <span class="swal-room__name">
            <strong>${escapeHtml(room.name)}</strong>
            <small>${escapeHtml(sub)} · ${roomDailyRateLabel(room)}</small>
          </span>
          <span class="swal-room__status">${meta.label}</span>
        </li>`
    })
    .join('')

  return `
    <div class="swal-rooms">
      <div class="swal-rooms__summary">
        <span class="swal-rooms__count"><b>${availableCount}</b> ห้องว่าง <small>จาก ${rooms.length} ห้อง</small></span>
        <span class="swal-rooms__price">พิเศษ 1,500 · VIP 2,500 บาท/วัน</span>
      </div>
      <ul class="swal-rooms__list">${items}</ul>
      <p class="swal-rooms__hint">ห้องที่ยกเลิกจองแล้วจะกลับมาเป็น “ว่าง” ทันทีที่ทีมพยาบาลอัปเดต</p>
    </div>`
}

async function openDayModal(date: string) {
  const isMobile = window.matchMedia('(max-width: 760px)').matches
  void vipSwal.fire({
    title: `<small class="swal-rooms__kicker">สถานะห้องพิเศษ · กดปิดเพื่อกลับไปปฏิทิน</small>${formatThaiDateFull(date)}`,
    position: isMobile ? 'bottom' : 'center',
    html: '<div class="swal-rooms__loading">กำลังโหลดสถานะรายห้อง…</div>',
    showConfirmButton: false,
    showCloseButton: true,
    customClass: {
      popup: 'vipward-swal vipward-swal--rooms',
      title: 'vipward-swal__title vipward-swal__title--rooms',
      htmlContainer: 'vipward-swal__body vipward-swal__body--rooms',
      closeButton: 'vipward-swal__close',
      footer: 'vipward-swal__footer',
    },
    footer:
      '<a href="tel:+6653870444" class="btn btn--primary swal-rooms__call">โทรยืนยันห้องว่าง 053-870-444</a>',
    didOpen: async () => {
      try {
        const data = await fetchAvailability(date)
        vipSwal.update({ html: roomListHtml(data.rooms) })
      } catch (err) {
        vipSwal.update({
          html: `<div class="swal-rooms__loading swal-rooms__loading--error">${escapeHtml(
            err instanceof Error ? err.message : 'ยังโหลดข้อมูลไม่ได้',
          )}<br/>กรุณาโทร 053-870-444</div>`,
        })
      }
    },
  })
}

/* ---------- ปฏิทิน ---------- */

export function RoomTypes() {
  const today = isoToday()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [days, setDays] = useState<CalendarDay[]>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCalendar = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError('')
    try {
      const data = await fetchAvailabilityMonth(month)
      setDays(data.days)
      setSelectedDate((current) => (current.startsWith(month) ? current : `${month}-01`))
    } catch (err) {
      setDays([])
      setError(err instanceof Error ? err.message : 'ยังไม่สามารถตรวจสอบห้องว่างได้')
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void loadCalendar()
    const timer = window.setInterval(() => void loadCalendar(true), 60_000)
    return () => window.clearInterval(timer)
  }, [loadCalendar])

  const calendarCells = useMemo(() => {
    if (!days.length) return []
    const first = new Date(`${days[0].date}T12:00:00`)
    const mondayOffset = (first.getDay() + 6) % 7
    return [...Array<CalendarDay | null>(mondayOffset).fill(null), ...days]
  }, [days])

  const selectedDay = days.find((day) => day.date === selectedDate) ?? days[0]

  function goToday() {
    setMonth(today.slice(0, 7))
    setSelectedDate(today)
  }

  function pickDay(date: string) {
    setSelectedDate(date)
    void openDayModal(date)
  }

  return (
    <section className="section section--alt flavors-section" id="rooms">
      <div className="section__header reveal">
        <span className="section__label">ปฏิทินห้องพิเศษ</span>
        <h2 className="section__title">เช็กห้องว่างได้ในแต่ละวัน</h2>
        <p className="section__desc">
          กดที่วันในปฏิทินเพื่อดูว่าห้องไหนว่าง ห้องไหนติดจอง หรือกำลังเตรียมห้อง
          ข้อมูลอัปเดตจากทีมพยาบาลและควรโทรยืนยันก่อนเข้าพัก
        </p>
      </div>

      <div className="room-calendar reveal">
        <div className="room-calendar__toolbar">
          <div className="room-calendar__month">
            <CalendarDays size={24} />
            <div>
              <small>ตารางห้องพิเศษ</small>
              <h3>{formatThaiMonth(month)}</h3>
            </div>
          </div>
          <div className="room-calendar__actions">
            <button type="button" className="room-calendar__today" onClick={goToday}>วันนี้</button>
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setMonth((value) => shiftMonths(value, -1))}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => setMonth((value) => shiftMonths(value, 1))}>
              <ChevronRight size={20} />
            </button>
            <button
              type="button"
              aria-label="อัปเดตข้อมูล"
              disabled={loading}
              onClick={() => void loadCalendar()}
            >
              <RefreshCw size={18} className={loading ? 'is-spinning' : ''} />
            </button>
          </div>
        </div>

        <div className="room-calendar__weekdays" aria-hidden="true">
          {thaiWeekdaysShort.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>

        {error ? (
          <div className="room-calendar__error">
            <Phone size={24} />
            <div><strong>ยังโหลดปฏิทินไม่ได้</strong><span>{error} กรุณาโทร 053-870-444</span></div>
          </div>
        ) : (
          <div className={`room-calendar__grid${loading ? ' is-loading' : ''}`}>
            {calendarCells.map((day, index) =>
              day ? (
                <button
                  type="button"
                  key={day.date}
                  title={`ดูสถานะรายห้อง ${formatThaiDateFull(day.date)}`}
                  className={[
                    'calendar-day',
                    day.date === today ? 'calendar-day--today' : '',
                    day.date === selectedDate ? 'calendar-day--selected' : '',
                    day.counts.available === 0 ? 'calendar-day--full' : '',
                    day.counts.available <= 3 && day.counts.available > 0 ? 'calendar-day--limited' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => pickDay(day.date)}
                >
                  <span className="calendar-day__top">
                    <strong>{Number(day.date.slice(-2))}</strong>
                    {day.date === today ? <small>วันนี้</small> : null}
                  </span>
                  <span className="calendar-day__availability">
                    <BedDouble size={16} />
                    {day.counts.available > 0
                      ? <><b>{day.counts.available}</b> ห้องว่าง</>
                      : <b>ห้องเต็ม</b>}
                  </span>
                  <span className="calendar-day__details">
                    {day.counts.reserved > 0 ? <i className="calendar-chip calendar-chip--reserved">จอง {day.counts.reserved}</i> : null}
                    {day.counts.occupied > 0 ? <i className="calendar-chip calendar-chip--occupied">พัก {day.counts.occupied}</i> : null}
                    {day.counts.cleaning > 0 ? <i className="calendar-chip calendar-chip--cleaning">เตรียม {day.counts.cleaning}</i> : null}
                    {day.counts.maintenance > 0 ? <i className="calendar-chip calendar-chip--maintenance">ปิด {day.counts.maintenance}</i> : null}
                    {day.details.length === 0 ? <i className="calendar-chip calendar-chip--clear">พร้อมทุกห้อง</i> : null}
                  </span>
                </button>
              ) : <span className="calendar-day calendar-day--empty" key={`empty-${index}`} />,
            )}
          </div>
        )}

        {selectedDay ? (
          <div className="calendar-detail">
            <div className="calendar-detail__date">
              <small>วันที่เลือกล่าสุด</small>
              <strong>{formatThaiDateFull(selectedDay.date)}</strong>
              <span>พิเศษ 1,500 · VIP 2,500 บาท/วัน</span>
            </div>
            <div className="calendar-detail__available">
              <span>{selectedDay.counts.available}</span>
              <small>ห้องว่าง<br />จาก 12 ห้อง</small>
            </div>
            <div className="calendar-detail__statuses">
              {(Object.keys(statusIcons) as Exclude<RoomStatus, 'available'>[]).map((status) => {
                const Icon = statusIcons[status]
                return (
                  <div className={`calendar-detail__status calendar-detail__status--${status}`} key={status}>
                    <Icon size={17} />
                    <span><small>{roomStatusMeta[status].label}</small><strong>{selectedDay.counts[status]} ห้อง</strong></span>
                  </div>
                )
              })}
            </div>
            <div className="calendar-detail__actions">
              <button
                type="button"
                className="btn calendar-detail__rooms"
                onClick={() => void openDayModal(selectedDay.date)}
              >
                <ListChecks size={17} /> ดูสถานะรายห้อง
              </button>
              <a href="tel:+6653870444" className="btn btn--primary calendar-detail__call">
                <Phone size={17} /> โทรยืนยันห้องว่าง
              </a>
            </div>
          </div>
        ) : null}
      </div>

      <p className="availability-note reveal">
        สถานะห้องอาจเปลี่ยนแปลงตามการรับผู้ป่วย ข้อมูลนี้ใช้ประกอบการตรวจสอบเบื้องต้น
        กรุณาโทรยืนยันกับหอผู้ป่วยที่หมายเลข 053-870-444
      </p>
    </section>
  )
}
