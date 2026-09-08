import {
  ArrowLeftRight,
  BedDouble,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  clearRoomStatus,
  dischargeReasons,
  dischargeRoom,
  fetchAdminAvailability,
  fetchAdminSession,
  fetchWardStats,
  postAdminAuth,
  roomStatusMeta,
  transferRoom,
  updateRoomStatus,
  isVipRoom,
  type AdminSession,
  type AvailabilityRoom,
  type DischargeReason,
  type RoomStatus,
  type WardStats,
} from '../api/availability'
import { alertError, confirmAction, toastError, toastSuccess, vipSwal } from '../lib/swal'
import {
  formatThaiDate,
  formatThaiDateFull,
  formatThaiDateTime,
  isoToday,
  shiftDays,
  cleaningCountdown,
} from '../lib/thaiDate'
import { ThaiDatePicker } from './ThaiDatePicker'
import { AdminStats } from './AdminStats'

const statuses: { value: RoomStatus; icon: typeof CheckCircle2 }[] = [
  { value: 'available', icon: CheckCircle2 },
  { value: 'reserved', icon: Clock3 },
  { value: 'occupied', icon: DoorOpen },
  { value: 'cleaning', icon: Sparkles },
  { value: 'maintenance', icon: Wrench },
]

function LoginPanel({
  setupRequired,
  onSuccess,
}: {
  setupRequired: boolean
  onSuccess: (session: AdminSession) => void
}) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (setupRequired && password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      void toastError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await postAdminAuth({
        action: setupRequired ? 'setup' : 'login',
        username,
        password,
        ...(setupRequired ? { displayName } : {}),
      })
      const name = result.user?.displayName || result.user?.username || ''
      if (setupRequired) {
        await vipSwal.fire({
          icon: 'success',
          title: 'สร้างบัญชีเรียบร้อย',
          text: `ยินดีต้อนรับ ${name} เริ่มอัปเดตสถานะห้องได้เลย`,
          confirmButtonText: 'เริ่มใช้งาน',
        })
      } else {
        void toastSuccess(`ยินดีต้อนรับ ${name}`)
      }
      onSuccess(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ'
      setError(message)
      void alertError('เข้าสู่ระบบไม่สำเร็จ', message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <div className="admin-login__deco admin-login__deco--one" />
      <div className="admin-login__deco admin-login__deco--two" />
      <form className="admin-login__card" onSubmit={submit}>
        <div className="admin-login__logo"><ShieldCheck size={32} /></div>
        <span className="admin-kicker">CPK VIP WARD</span>
        <h1>{setupRequired ? 'ตั้งค่าบัญชีพยาบาลครั้งแรก' : 'เข้าสู่ระบบพยาบาล'}</h1>
        <p>
          {setupRequired
            ? 'สร้างบัญชีผู้ดูแลหลักสำหรับอัปเดตห้องว่าง'
            : 'จัดการสถานะห้องพิเศษและติดตามห้องว่างรายวัน'}
        </p>

        {setupRequired ? (
          <label className="admin-field">
            <span>ชื่อที่แสดง</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          </label>
        ) : null}
        <label className="admin-field">
          <span>ชื่อผู้ใช้</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="admin-field">
          <span>รหัสผ่าน</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={setupRequired ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
        </label>
        {setupRequired ? (
          <label className="admin-field">
            <span>ยืนยันรหัสผ่าน</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        ) : null}
        {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
        <button className="btn btn--primary admin-login__submit" disabled={submitting}>
          {submitting ? (
            'กำลังดำเนินการ…'
          ) : setupRequired ? (
            'สร้างบัญชีและเริ่มใช้งาน'
          ) : (
            <><LogIn size={18} /> เข้าสู่ระบบ</>
          )}
        </button>
        <a href="../" className="admin-login__back">กลับหน้าเว็บไซต์</a>
      </form>
    </main>
  )
}

function StatusEditor({
  room,
  rooms,
  selectedDate,
  onClose,
  onSaved,
}: {
  room: AvailabilityRoom
  rooms: AvailabilityRoom[]
  selectedDate: string
  onClose: () => void
  onSaved: () => void
}) {
  const [status, setStatus] = useState<RoomStatus>(room.status)
  const [endDate, setEndDate] = useState(selectedDate)
  const [note, setNote] = useState(room.note ?? '')
  const [reason, setReason] = useState<DischargeReason>('home')
  const [toRoomId, setToRoomId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [, setCountdownTick] = useState(0)

  const transferTargets = rooms.filter(
    (item) => item.id !== room.id && (item.status === 'available' || item.status === 'cleaning'),
  )

  useEffect(() => {
    if (room.status !== 'cleaning' || !room.autoAvailableAt) return
    const timer = window.setInterval(() => setCountdownTick((tick) => tick + 1), 15_000)
    return () => window.clearInterval(timer)
  }, [room.status, room.autoAvailableAt])

  const dayCount = useMemo(() => {
    const diff = Math.round(
      (new Date(`${endDate}T12:00:00`).getTime() - new Date(`${selectedDate}T12:00:00`).getTime()) / 86_400_000,
    )
    return Math.max(diff, 0) + 1
  }, [endDate, selectedDate])

  const rangeLabel =
    endDate === selectedDate
      ? formatThaiDate(selectedDate)
      : `${formatThaiDate(selectedDate)} – ${formatThaiDate(endDate)} (${dayCount} วัน)`

  const isChange = status !== room.status || note !== (room.note ?? '') || endDate !== selectedDate

  async function save(event: FormEvent) {
    event.preventDefault()
    if (dayCount > 1) {
      const confirm = await confirmAction({
        title: `บันทึก ${dayCount} วันติดกัน?`,
        text: `${room.name} จะถูกตั้งเป็น “${roomStatusMeta[status].label}” ตั้งแต่ ${rangeLabel}`,
        confirmText: 'บันทึกทั้งหมด',
      })
      if (!confirm.isConfirmed) return
    }
    setSaving(true)
    setError('')
    try {
      // ส่งเป็น ISO ค.ศ. เข้าฐานข้อมูล
      const result = await updateRoomStatus({
        roomId: room.id,
        startDate: selectedDate,
        endDate,
        status,
        note,
      })
      void toastSuccess(`${room.name} → ${roomStatusMeta[status].label} · ${result.message}`)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ'
      setError(message)
      void alertError('บันทึกไม่สำเร็จ', message)
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    const confirm = await confirmAction({
      title: 'ลบสถานะห้องนี้?',
      text: `${room.name} จะกลับเป็น “ว่าง” ในวันที่ ${rangeLabel} และลบหมายเหตุภายในด้วย`,
      confirmText: 'ลบสถานะ',
      danger: true,
    })
    if (!confirm.isConfirmed) return
    setSaving(true)
    setError('')
    try {
      const result = await clearRoomStatus({ roomId: room.id, startDate: selectedDate, endDate })
      void toastSuccess(result.message)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ลบสถานะไม่สำเร็จ'
      setError(message)
      void alertError('ลบสถานะไม่สำเร็จ', message)
    } finally {
      setSaving(false)
    }
  }

  async function discharge() {
    const label = dischargeReasons.find((item) => item.value === reason)?.label ?? 'จำหน่าย'
    const confirm = await confirmAction({
      title: `จำหน่าย ${room.name}?`,
      text: `ผู้ป่วยออกจากห้องแล้ว (${label}) ห้องจะไปสถานะทำความสะอาด และนับเข้าสถิติจำหน่าย ไม่ใช้คำว่าชำระเงินแล้ว`,
      confirmText: 'จำหน่ายห้อง',
    })
    if (!confirm.isConfirmed) return
    setSaving(true)
    setError('')
    try {
      const result = await dischargeRoom({ roomId: room.id, date: selectedDate, reason, note })
      void toastSuccess(result.message)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'จำหน่ายไม่สำเร็จ'
      setError(message)
      void alertError('จำหน่ายไม่สำเร็จ', message)
    } finally {
      setSaving(false)
    }
  }

  async function transfer() {
    if (!toRoomId) {
      void toastError('กรุณาเลือกห้องปลายทาง')
      return
    }
    const dest = rooms.find((item) => item.id === toRoomId)
    const confirm = await confirmAction({
      title: `ย้ายไป ${dest?.name ?? 'ห้องอื่น'}?`,
      text: `ย้ายจาก ${room.name} ไปห้องพิเศษห้องอื่นในหอเดียวกัน ห้องเดิมจะทำความสะอาด วันเข้าพักที่เหลือจะย้ายตามไป`,
      confirmText: 'ย้ายห้อง',
    })
    if (!confirm.isConfirmed) return
    setSaving(true)
    setError('')
    try {
      const result = await transferRoom({ roomId: room.id, toRoomId, date: selectedDate, note })
      void toastSuccess(result.message)
      onSaved()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ย้ายห้องไม่สำเร็จ'
      setError(message)
      void alertError('ย้ายห้องไม่สำเร็จ', message)
    } finally {
      setSaving(false)
    }
  }

  function requestClose() {
    if (!isChange) {
      onClose()
      return
    }
    void confirmAction({
      title: 'ยังไม่ได้บันทึก',
      text: 'ปิดหน้าต่างโดยไม่บันทึกการเปลี่ยนแปลงใช่ไหม',
      confirmText: 'ปิดโดยไม่บันทึก',
      cancelText: 'กลับไปแก้ไข',
      danger: true,
    }).then((result) => {
      if (result.isConfirmed) onClose()
    })
  }

  const hasRecord = room.status !== 'available' || Boolean(room.note)

  return (
    <div className="admin-editor-backdrop" role="presentation" onMouseDown={requestClose}>
      <form className="admin-editor" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
        <div className="admin-editor__visual" style={{ background: room.swatch }}>
          <span>แก้ไขสถานะ</span>
          <h2>{room.name}</h2>
          <small>
            สถานะปัจจุบัน: {roomStatusMeta[room.status].label}
            {room.updatedAt ? ` · อัปเดต ${formatThaiDateTime(room.updatedAt)}` : ''}
            {room.updatedBy ? ` โดย ${room.updatedBy}` : ''}
            {room.status === 'cleaning' && room.autoAvailableAt ? ` · ${cleaningCountdown(room.autoAvailableAt)}` : ''}
          </small>
        </div>
        <div className="admin-editor__body">
          <div className="admin-field">
            <span>ตั้งแต่วันที่</span>
            <ThaiDatePicker value={selectedDate} onChange={() => undefined} disabled />
          </div>
          <div className="admin-field">
            <span>ถึงวันที่</span>
            <ThaiDatePicker value={endDate} min={selectedDate} onChange={setEndDate} />
          </div>
          <p className="admin-editor__range">ช่วงที่บันทึก: {rangeLabel}</p>

          <fieldset className="admin-status-picker">
            <legend>สถานะห้อง</legend>
            {statuses.map(({ value, icon: Icon }) => (
              <label className={`admin-status-option admin-status-option--${value}`} key={value}>
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={status === value}
                  onChange={() => setStatus(value)}
                />
                <Icon size={19} />
                <span>{roomStatusMeta[value].label}</span>
              </label>
            ))}
          </fieldset>

          <label className="admin-field">
            <span>หมายเหตุภายใน (ไม่แสดงหน้าเว็บ)</span>
            <textarea
              rows={3}
              value={note}
              maxLength={250}
              placeholder="เช่น รอย้ายห้อง หรือแจ้งซ่อม — ไม่ควรใส่ชื่อผู้ป่วย"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <p className="admin-editor__privacy">เพื่อความเป็นส่วนตัว กรุณาไม่ระบุชื่อหรือข้อมูลสุขภาพของผู้ป่วย</p>

          {room.status === 'cleaning' ? (
            <p className="admin-editor__clean-hint">
              พยาบาลกดเป็น “ว่าง” เมื่อทำความสะอาดเสร็จ หรือระบบจะว่างอัตโนมัติใน 1 ชั่วโมง
              {room.autoAvailableAt ? ` · ${cleaningCountdown(room.autoAvailableAt)}` : ''}
            </p>
          ) : null}

          {room.status === 'occupied' ? (
            <div className="admin-care">
              <h3>เมื่อผู้ป่วยออกจากห้อง</h3>
              <p>จำหน่าย = ออกจากหอพิเศษแล้ว · ย้ายห้อง = ย้ายไปห้องพิเศษห้องอื่นในหอเดียวกัน</p>

              <div className="admin-care__block">
                <fieldset className="admin-reason-picker">
                  <legend>เหตุผลจำหน่าย</legend>
                  {dischargeReasons.map((item) => (
                    <label key={item.value}>
                      <input type="radio" name="reason" checked={reason === item.value} onChange={() => setReason(item.value)} />
                      {item.label}
                    </label>
                  ))}
                </fieldset>
                <button type="button" className="btn admin-btn--discharge" onClick={() => void discharge()} disabled={saving}>
                  <LogOut size={18} />
                  จำหน่ายห้องนี้
                </button>
              </div>

              <div className="admin-care__block admin-care__block--transfer">
                <span className="admin-care__label">ย้ายไปห้องพิเศษห้องอื่น</span>
                {transferTargets.length > 0 ? (
                  <div className="admin-room-pick" role="listbox" aria-label="เลือกห้องปลายทาง">
                    {transferTargets.map((item) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={toRoomId === item.id}
                        className={`admin-room-pick__item${toRoomId === item.id ? ' is-selected' : ''}`}
                        key={item.id}
                        onClick={() => setToRoomId(item.id)}
                      >
                        <i style={{ background: item.swatch }} />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{roomStatusMeta[item.status].label}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="admin-room-pick__empty">ขณะนี้ไม่มีห้องว่างให้ย้าย</p>
                )}
                <button
                  type="button"
                  className="btn admin-btn--transfer"
                  onClick={() => void transfer()}
                  disabled={saving || !toRoomId}
                >
                  <ArrowLeftRight size={18} />
                  ย้ายห้อง
                </button>
              </div>
            </div>
          ) : null}

          {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}
          <div className="admin-editor__actions">
            {hasRecord ? (
              <button type="button" className="btn admin-btn--danger" onClick={() => void clear()} disabled={saving}>
                <Trash2 size={16} /> ลบสถานะ
              </button>
            ) : null}
            <span className="admin-editor__spacer" />
            <button type="button" className="btn admin-btn--ghost" onClick={requestClose} disabled={saving}>ยกเลิก</button>
            <button className="btn btn--primary" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึกสถานะ'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export function AdminPage() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [date, setDate] = useState(isoToday)
  const [rooms, setRooms] = useState<AvailabilityRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<AvailabilityRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<WardStats | null>(null)

  useEffect(() => {
    fetchAdminSession()
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : 'เปิดระบบไม่ได้'))
      .finally(() => setLoading(false))
  }, [])

  const loadRooms = useCallback(async (quiet = false) => {
    if (!session?.authenticated) return
    if (!quiet) setLoading(true)
    setError('')
    try {
      const data = await fetchAdminAvailability(date)
      setRooms(data.rooms)
      try {
        setStats(await fetchWardStats(date))
      } catch {
        /* ห้องยังใช้ได้ แม้สถิติยังไม่พร้อม */
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'โหลดข้อมูลไม่สำเร็จ'
      setError(message)
      if (!quiet) void toastError(message)
    } finally {
      setLoading(false)
    }
  }, [date, session?.authenticated])

  useEffect(() => {
    if (!session?.authenticated) return
    void loadRooms()
    const timer = window.setInterval(() => void loadRooms(true), 30_000)
    return () => window.clearInterval(timer)
  }, [loadRooms, session?.authenticated])

  const counts = useMemo(() => {
    const result = Object.fromEntries(statuses.map(({ value }) => [value, 0])) as Record<RoomStatus, number>
    rooms.forEach((room) => result[room.status]++)
    return result
  }, [rooms])

  async function changePassword() {
    const result = await vipSwal.fire({
      title: 'เปลี่ยนรหัสผ่าน',
      html: `
        <div class="swal-pass">
          <label>รหัสผ่านปัจจุบัน<input id="vip-pass-current" type="password" autocomplete="current-password" /></label>
          <label>รหัสผ่านใหม่<input id="vip-pass-new" type="password" autocomplete="new-password" /></label>
          <label>ยืนยันรหัสผ่านใหม่<input id="vip-pass-confirm" type="password" autocomplete="new-password" /></label>
          <p class="swal-pass__hint">ใช้อย่างน้อย 8 ตัวอักษร ตัวพิมพ์เล็ก-ใหญ่มีผล</p>
        </div>
      `,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'บันทึกรหัสใหม่',
      cancelButtonText: 'ยกเลิก',
      preConfirm: () => {
        const currentPassword = (document.getElementById('vip-pass-current') as HTMLInputElement | null)?.value ?? ''
        const newPassword = (document.getElementById('vip-pass-new') as HTMLInputElement | null)?.value ?? ''
        const confirmPassword = (document.getElementById('vip-pass-confirm') as HTMLInputElement | null)?.value ?? ''
        if (!currentPassword || !newPassword || !confirmPassword) {
          vipSwal.showValidationMessage('กรุณากรอกให้ครบทุกช่อง')
          return false
        }
        if (newPassword.length < 8) {
          vipSwal.showValidationMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร')
          return false
        }
        if (newPassword !== confirmPassword) {
          vipSwal.showValidationMessage('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน')
          return false
        }
        return { currentPassword, newPassword, confirmPassword }
      },
    })
    if (!result.isConfirmed || !result.value) return
    const payload = result.value as { currentPassword: string; newPassword: string; confirmPassword: string }
    try {
      const data = await postAdminAuth({
        action: 'password',
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
      })
      void toastSuccess(data.message || 'เปลี่ยนรหัสผ่านแล้ว')
    } catch (err) {
      void alertError('เปลี่ยนรหัสผ่านไม่สำเร็จ', err instanceof Error ? err.message : 'กรุณาลองใหม่')
    }
  }

  async function logout() {
    const confirm = await confirmAction({
      title: 'ออกจากระบบ?',
      text: 'คุณจะต้องเข้าสู่ระบบใหม่เพื่ออัปเดตสถานะห้อง',
      confirmText: 'ออกจากระบบ',
    })
    if (!confirm.isConfirmed) return
    await postAdminAuth({ action: 'logout' })
    setSession({ ok: true, authenticated: false, setupRequired: false })
    void toastSuccess('ออกจากระบบแล้ว')
  }

  if (!session?.authenticated) {
    if (loading && !session) {
      return <main className="admin-loading"><RefreshCw className="is-spinning" /> กำลังเปิดระบบ…</main>
    }
    if (!session && error) {
      return <main className="admin-loading">{error}</main>
    }
    return <LoginPanel setupRequired={Boolean(session?.setupRequired)} onSuccess={setSession} />
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div className="admin-header__brand">
          <div className="admin-header__logo">CPK</div>
          <div>
            <span>VIP WARD MONITOR</span>
            <strong>ระบบติดตามห้องพิเศษ</strong>
          </div>
        </div>
        <div className="admin-header__user">
          <span>ผู้ใช้งาน</span>
          <strong>{session.user?.displayName || session.user?.username}</strong>
          <div className="admin-header__actions">
            <button type="button" onClick={() => void changePassword()} title="เปลี่ยนรหัสผ่าน"><KeyRound size={18} /></button>
            <button type="button" onClick={() => void logout()} title="ออกจากระบบ"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="admin-main">
        <section className="admin-welcome">
          <div>
            <span className="admin-kicker">NURSE DASHBOARD</span>
            <h1>สวัสดีค่ะ ทีมพยาบาล</h1>
            <p>ตรวจสอบและอัปเดตสถานะห้อง กดที่การ์ดห้องเพื่อแก้ไข</p>
          </div>
          <a href="../" className="admin-public-link">ดูหน้าเว็บไซต์</a>
        </section>

        <section className="admin-datebar">
          <button type="button" aria-label="วันก่อนหน้า" onClick={() => setDate((current) => shiftDays(current, -1))}><ChevronLeft /></button>
          <ThaiDatePicker value={date} onChange={setDate} label="กำลังดูข้อมูลวันที่" variant="bar" />
          <button type="button" aria-label="วันถัดไป" onClick={() => setDate((current) => shiftDays(current, 1))}><ChevronRight /></button>
          <button className="admin-datebar__today" type="button" onClick={() => setDate(isoToday())}>วันนี้</button>
          <button className="admin-datebar__refresh" type="button" onClick={() => void loadRooms()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'is-spinning' : ''} /> อัปเดต
          </button>
        </section>

        {error ? <div className="admin-alert admin-alert--error">{error}</div> : null}

        <section className="admin-stats">
          <article className="admin-stat admin-stat--total">
            <BedDouble /><span><small>ห้องทั้งหมด</small><strong>{rooms.length}</strong></span>
          </article>
          {statuses.map(({ value, icon: Icon }) => (
            <article className={`admin-stat admin-stat--${value}`} key={value}>
              <Icon /><span><small>{roomStatusMeta[value].label}</small><strong>{counts[value]}</strong></span>
            </article>
          ))}
        </section>

        <section className="admin-board">
          <div className="admin-board__heading">
            <div>
              <h2>สถานะห้องรายวัน</h2>
              <p>{formatThaiDateFull(date)} · อัปเดตอัตโนมัติทุก 30 วินาที</p>
            </div>
            <div className="admin-board__available">
              <span>{counts.available}</span> ห้องว่าง
            </div>
          </div>

          <div className={`admin-room-grid${loading ? ' is-loading' : ''}`}>
            {rooms.map((room, index) => (
              <button
                type="button"
                className={`admin-room admin-room--${room.status}${isVipRoom(room) ? ' admin-room--vip' : ''}`}
                key={room.id}
                onClick={() => setSelectedRoom(room)}
              >
                <span className="admin-room__number">{String(index + 1).padStart(2, '0')}</span>
                <span className="admin-room__content">
                  <small>{room.category}</small>
                  <strong>{room.name}</strong>
                  <span className={`admin-room__badge admin-room__badge--${room.status}`}>
                    <i /> {roomStatusMeta[room.status].label}
                  </span>
                  {isVipRoom(room) ? <em className="admin-room__rate">2,500 บาท/วัน</em> : null}
                  {room.note ? <em>{room.note}</em> : null}
                  {room.status === 'cleaning' && room.autoAvailableAt ? (
                    <time className="is-cleaning-timer">{cleaningCountdown(room.autoAvailableAt)}</time>
                  ) : room.updatedAt ? (
                    <time>อัปเดต {formatThaiDateTime(room.updatedAt)}</time>
                  ) : null}
                </span>
                <span className="admin-room__edit">แก้ไข</span>
              </button>
            ))}
          </div>
        </section>

        <AdminStats stats={stats} loading={loading} />
      </div>

      {selectedRoom ? (
        <StatusEditor
          key={`${selectedRoom.id}-${date}`}
          room={selectedRoom}
          rooms={rooms}
          selectedDate={date}
          onClose={() => setSelectedRoom(null)}
          onSaved={() => {
            setSelectedRoom(null)
            void loadRooms()
          }}
        />
      ) : null}
    </main>
  )
}
