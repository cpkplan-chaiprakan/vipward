export type RoomStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance'

export type AvailabilityRoom = {
  id: string
  name: string
  category: string
  swatch: string
  status: RoomStatus
  note?: string
  updatedBy?: string | null
  updatedAt?: string | null
  autoAvailableAt?: string | null
}

export type AvailabilityResponse = {
  ok: boolean
  date: string
  rooms: AvailabilityRoom[]
  counts?: Record<RoomStatus | 'total', number>
  message?: string
}

export type CalendarDay = {
  date: string
  counts: Record<RoomStatus | 'total', number>
  details: {
    roomId: string
    roomName: string
    status: Exclude<RoomStatus, 'available'>
  }[]
}

export type AvailabilityCalendarResponse = {
  ok: boolean
  month: string
  days: CalendarDay[]
  totalRooms: number
  message?: string
}

export function isVipRoom(room: { id?: string; category?: string } | null | undefined) {
  if (!room) return false
  return room.category === 'VIP' || room.id === 'near-nurse'
}

export function roomDailyRateLabel(room: { id?: string; category?: string }) {
  return isVipRoom(room) ? '2,500 บาท/วัน' : '1,500 บาท/วัน'
}

export const roomStatusMeta: Record<
  RoomStatus,
  { label: string; publicLabel: string; shortLabel: string }
> = {
  available: { label: 'ว่าง', publicLabel: 'ว่าง', shortLabel: 'ว่าง' },
  reserved: { label: 'ติดจอง', publicLabel: 'ไม่ว่าง', shortLabel: 'จอง' },
  occupied: { label: 'เข้าพัก', publicLabel: 'ไม่ว่าง', shortLabel: 'พัก' },
  cleaning: { label: 'ทำความสะอาด', publicLabel: 'กำลังเตรียมห้อง', shortLabel: 'เตรียม' },
  maintenance: { label: 'ปิดปรับปรุง', publicLabel: 'ไม่พร้อมใช้งาน', shortLabel: 'ปิด' },
}

function apiUrl(file: string): string {
  const configured = import.meta.env.VITE_API_BASE
  if (configured) {
    return `${configured.replace(/\/$/, '')}/api/${file}`
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/api/${file}`
}

async function jsonFetch<T>(file: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(file), {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const data = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
  }
  return data
}

export function fetchAvailability(date: string): Promise<AvailabilityResponse> {
  return jsonFetch(`availability.php?date=${encodeURIComponent(date)}`)
}

export function fetchAvailabilityMonth(month: string): Promise<AvailabilityCalendarResponse> {
  return jsonFetch(`availability.php?month=${encodeURIComponent(month)}`)
}

export type AdminSession = {
  ok: boolean
  authenticated: boolean
  setupRequired?: boolean
  user?: { id: number; username: string; displayName: string } | null
  message?: string
}

export function fetchAdminSession(): Promise<AdminSession> {
  return jsonFetch('admin-auth.php')
}

export function postAdminAuth(payload: Record<string, string>): Promise<AdminSession> {
  return jsonFetch('admin-auth.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function fetchAdminAvailability(date: string): Promise<AvailabilityResponse> {
  return jsonFetch(`admin-availability.php?date=${encodeURIComponent(date)}`)
}

export type StatusMutationResult = { ok: boolean; message: string; updated: number }

/** วันที่ทุกค่าเป็น ISO ค.ศ. (YYYY-MM-DD) — ฐานข้อมูลเก็บเป็น ค.ศ. เสมอ */
export function updateRoomStatus(payload: {
  roomId: string
  startDate: string
  endDate: string
  status: RoomStatus
  note: string
}): Promise<StatusMutationResult> {
  return jsonFetch('admin-availability.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', ...payload }),
  })
}

/** ลบสถานะในช่วงวันที่ (ห้องกลับเป็นว่าง) */
export function clearRoomStatus(payload: {
  roomId: string
  startDate: string
  endDate: string
}): Promise<StatusMutationResult> {
  return jsonFetch('admin-availability.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear', ...payload }),
  })
}

export const dischargeReasons = [
  { value: 'home', label: 'กลับบ้าน' },
  { value: 'transfer_ward', label: 'ย้ายหอผู้ป่วยอื่น' },
  { value: 'refer', label: 'ส่งต่อ รพ. อื่น' },
  { value: 'other', label: 'อื่น ๆ' },
] as const

export type DischargeReason = (typeof dischargeReasons)[number]['value']

export const eventTypeMeta: Record<string, { label: string; tone: string }> = {
  occupied: { label: 'เข้าพัก', tone: 'occupied' },
  reserved: { label: 'ติดจอง', tone: 'reserved' },
  discharged: { label: 'จำหน่าย', tone: 'available' },
  transferred: { label: 'ย้ายห้อง', tone: 'cleaning' },
  cancelled: { label: 'ยกเลิกจอง', tone: 'maintenance' },
}

export function dischargeRoom(payload: {
  roomId: string
  date: string
  reason: DischargeReason
  note: string
}): Promise<StatusMutationResult & { nights?: number }> {
  return jsonFetch('admin-availability.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'discharge',
      roomId: payload.roomId,
      startDate: payload.date,
      endDate: payload.date,
      reason: payload.reason,
      note: payload.note,
    }),
  })
}

export function transferRoom(payload: {
  roomId: string
  toRoomId: string
  date: string
  note: string
}): Promise<StatusMutationResult> {
  return jsonFetch('admin-availability.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'transfer',
      roomId: payload.roomId,
      toRoomId: payload.toRoomId,
      startDate: payload.date,
      endDate: payload.date,
      note: payload.note,
    }),
  })
}

export type WardEvent = {
  id: number
  type: string
  date: string
  nights: number
  reason: string | null
  note: string | null
  by: string | null
  at: string
  roomName: string
  relatedRoomName: string | null
}

export type WardStats = {
  ok: boolean
  date: string
  month: string
  totalRooms: number
  today: {
    counts: Record<RoomStatus | 'total', number>
    events: { occupied: number; discharged: number; transferred: number; reserved: number }
    occupancyRate: number
  }
  monthStats: {
    events: { occupied: number; discharged: number; transferred: number; reserved: number }
    stayNights: number
    avgStay: number
    occupiedBedDays: number
    occupancyRate: number
    reasons: Record<DischargeReason, number>
  }
  trend: { date: string; occupied: number; discharged: number; transferred: number }[]
  recent: WardEvent[]
}

export function fetchWardStats(date: string): Promise<WardStats> {
  const month = date.slice(0, 7)
  return jsonFetch(`admin-stats.php?date=${encodeURIComponent(date)}&month=${encodeURIComponent(month)}`)
}
