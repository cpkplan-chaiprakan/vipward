import { ArrowLeftRight, BedDouble, ClipboardList, DoorOpen, Home, TrendingUp } from 'lucide-react'
import { dischargeReasons, eventTypeMeta, type WardStats } from '../api/availability'
import { formatThaiDate, formatThaiDateTime, formatThaiMonth } from '../lib/thaiDate'

const reasonLabel = Object.fromEntries(dischargeReasons.map((item) => [item.value, item.label]))

export function AdminStats({ stats, loading }: { stats: WardStats | null; loading: boolean }) {
  if (!stats) {
    return (
      <section className={`admin-insight${loading ? ' is-loading' : ''}`}>
        <p className="admin-insight__empty">กำลังรวบรวมสถิติห้องพิเศษ…</p>
      </section>
    )
  }

  const maxTrend = Math.max(1, ...stats.trend.map((day) => day.occupied + day.discharged + day.transferred))
  const monthLabel = formatThaiMonth(stats.month)

  const occupied = stats.today.counts.occupied
  const total = stats.totalRooms
  const rate = stats.today.occupancyRate
  const ring = 2 * Math.PI * 42
  const dash = ring * (Math.min(rate, 100) / 100)

  return (
    <section className={`admin-insight${loading ? ' is-loading' : ''}`}>
      <div className="admin-insight__hero">
        <div className="admin-occupancy">
          <svg className="admin-occupancy__ring" viewBox="0 0 108 108" aria-hidden="true">
            <circle cx="54" cy="54" r="42" />
            <circle cx="54" cy="54" r="42" style={{ strokeDasharray: `${dash} ${ring}` }} />
          </svg>
          <div className="admin-occupancy__copy">
            <strong>{rate}%</strong>
            <span>ครองเตียงวันนี้</span>
            <small>{occupied} จาก {total} ห้อง</small>
          </div>
        </div>
        <div className="admin-insight__intro">
          <span className="admin-kicker">WARD ANALYTICS</span>
          <h2>สถิติหอพิเศษ · {monthLabel}</h2>
          <ul className="admin-insight__pills">
            <li><b>{occupied}</b> เข้าพักวันนี้</li>
            <li><b>{stats.today.counts.available}</b> ว่าง</li>
            <li><b>{stats.today.events.discharged}</b> จำหน่ายวันนี้</li>
            <li><b>{stats.today.events.transferred}</b> ย้ายห้องวันนี้</li>
          </ul>
        </div>
      </div>

      <div className="admin-insight__kpis">
        <article>
          <DoorOpen size={18} />
          <span>เข้าพักเดือนนี้</span>
          <strong>{stats.monthStats.events.occupied}</strong>
        </article>
        <article>
          <Home size={18} />
          <span>จำหน่ายเดือนนี้</span>
          <strong>{stats.monthStats.events.discharged}</strong>
        </article>
        <article>
          <ArrowLeftRight size={18} />
          <span>ย้ายห้องเดือนนี้</span>
          <strong>{stats.monthStats.events.transferred}</strong>
        </article>
        <article>
          <BedDouble size={18} />
          <span>วันนอนเฉลี่ย</span>
          <strong>{stats.monthStats.avgStay || 0}<small> วัน</small></strong>
        </article>
        <article>
          <TrendingUp size={18} />
          <span>อัตราครองเตียงเดือนนี้</span>
          <strong>{stats.monthStats.occupancyRate}%</strong>
        </article>
      </div>

      <div className="admin-insight__grid">
        <div className="admin-insight__panel">
          <h3>เหตุผลจำหน่าย</h3>
          <div className="admin-reason-list">
            {dischargeReasons.map((item) => {
              const total = stats.monthStats.events.discharged || 1
              const count = stats.monthStats.reasons[item.value]
              return (
                <div className="admin-reason" key={item.value}>
                  <span>{item.label}</span>
                  <b>{count}</b>
                  <i style={{ width: `${Math.round((count / total) * 100)}%` }} />
                </div>
              )
            })}
          </div>
        </div>

        <div className="admin-insight__panel">
          <h3>แนวโน้มประจำเดือน</h3>
          <div className="admin-trend" aria-hidden="true">
            {stats.trend.map((day) => (
              <div className="admin-trend__col" key={day.date} title={`${formatThaiDate(day.date)} · เข้าพัก ${day.occupied} จำหน่าย ${day.discharged}`}>
                <span className="admin-trend__stack">
                  <i className="is-discharged" style={{ height: `${(day.discharged / maxTrend) * 100}%` }} />
                  <i className="is-occupied" style={{ height: `${(day.occupied / maxTrend) * 100}%` }} />
                  <i className="is-transferred" style={{ height: `${(day.transferred / maxTrend) * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
          <div className="admin-trend__legend">
            <span>เข้าพัก</span>
            <span>จำหน่าย</span>
            <span>ย้ายห้อง</span>
          </div>
        </div>
      </div>

      <div className="admin-insight__panel admin-insight__feed">
        <h3><ClipboardList size={18} /> รายการล่าสุดเดือนนี้</h3>
        {stats.recent.length === 0 ? (
          <p className="admin-insight__empty">ยังไม่มีรายการจำหน่ายหรือย้ายห้องในเดือนนี้</p>
        ) : (
          <ul>
            {stats.recent.map((item) => {
              const meta = eventTypeMeta[item.type] ?? eventTypeMeta.occupied
              const detail =
                item.type === 'transferred' && item.relatedRoomName
                  ? `${item.roomName} → ${item.relatedRoomName}`
                  : item.type === 'discharged'
                    ? `${item.roomName} · ${reasonLabel[item.reason ?? 'other'] ?? 'จำหน่าย'} · ${item.nights} วัน`
                    : item.roomName
              return (
                <li key={item.id}>
                  <span className={`admin-feed__tag admin-feed__tag--${meta.tone}`}>{meta.label}</span>
                  <span>
                    <strong>{detail}</strong>
                    <small>{formatThaiDate(item.date)}{item.by ? ` · ${item.by}` : ''}{item.at ? ` · ${formatThaiDateTime(item.at)}` : ''}</small>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
