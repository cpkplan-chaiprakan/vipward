/**
 * ตัวช่วยจัดการวันที่แบบไทย
 * - แสดงผลเป็น พ.ศ. ทุกจุด (ใช้ปฏิทินพุทธศักราชของ Intl)
 * - ค่าที่ส่งไป API / ฐานข้อมูล ยังเป็น ISO ค.ศ. (YYYY-MM-DD) เสมอ
 */

const BUDDHIST_LOCALE = 'th-TH-u-ca-buddhist-nu-latn'

export const thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export const thaiMonthsShort = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

export const thaiWeekdaysShort = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']

export function toBuddhistYear(ceYear: number) {
  return ceYear + 543
}

export function toChristianYear(beYear: number) {
  return beYear - 543
}

/** สร้าง Date ตอนเที่ยงเพื่อเลี่ยงปัญหา timezone */
export function isoToDate(iso: string) {
  return new Date(`${iso}T12:00:00`)
}

export function dateToIso(date: Date) {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function isoToday() {
  return dateToIso(new Date())
}

export function shiftDays(iso: string, days: number) {
  const next = isoToDate(iso)
  next.setDate(next.getDate() + days)
  return dateToIso(next)
}

export function shiftMonths(month: string, amount: number) {
  const next = isoToDate(`${month}-01`)
  next.setMonth(next.getMonth() + amount)
  return dateToIso(next).slice(0, 7)
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** เช่น "วันอังคารที่ 8 กันยายน 2569" */
export function formatThaiDateFull(iso: string) {
  const date = isoToDate(iso)
  const weekday = new Intl.DateTimeFormat('th-TH', { weekday: 'long' }).format(date)
  return `${weekday}ที่ ${date.getDate()} ${thaiMonths[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** เช่น "8 กันยายน 2569" */
export function formatThaiDate(iso: string) {
  const date = isoToDate(iso)
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** เช่น "8 ก.ย. 2569" */
export function formatThaiDateShort(iso: string) {
  const date = isoToDate(iso)
  return `${date.getDate()} ${thaiMonthsShort[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** เช่น "กันยายน 2569" */
export function formatThaiMonth(month: string) {
  const date = isoToDate(`${month}-01`)
  return `${thaiMonths[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** เวลาอัปเดตจาก MySQL ("2026-09-08 14:35:00") → "8 ก.ย. 2569 14:35" */
export function formatThaiDateTime(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return ''
  const time = new Intl.DateTimeFormat(BUDDHIST_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
  return `${parsed.getDate()} ${thaiMonthsShort[parsed.getMonth()]} ${toBuddhistYear(parsed.getFullYear())} ${time}`
}

export function cleaningCountdown(until?: string | null) {
  if (!until) return ''
  const end = new Date(until.replace(' ', 'T')).getTime()
  if (Number.isNaN(end)) return ''
  const ms = end - Date.now()
  if (ms <= 0) return 'กำลังว่างอัตโนมัติ…'
  const minutes = Math.ceil(ms / 60_000)
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest > 0
      ? `อีก ${hours} ชม. ${rest} นาที จะว่างอัตโนมัติ`
      : `อีก ${hours} ชม. จะว่างอัตโนมัติ`
  }
  return `อีก ${minutes} นาที จะว่างอัตโนมัติ`
}
