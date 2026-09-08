import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  daysInMonth,
  formatThaiDate,
  isoToDate,
  isoToday,
  thaiMonths,
  thaiWeekdaysShort,
  toBuddhistYear,
} from '../lib/thaiDate'

type ThaiDatePickerProps = {
  /** ค่า ISO ค.ศ. (YYYY-MM-DD) — เก็บลงฐานข้อมูลได้เลย */
  value: string
  onChange: (iso: string) => void
  /** ISO ค.ศ. วันแรกที่เลือกได้ */
  min?: string
  max?: string
  label?: string
  disabled?: boolean
  variant?: 'field' | 'bar'
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * ตัวเลือกวันที่แสดงเป็น พ.ศ. ทั้งปฏิทินและตัวเลือกปี
 * ค่าที่ส่งกลับเป็น ISO ค.ศ. เสมอ
 */
export function ThaiDatePicker({
  value,
  onChange,
  min,
  max,
  label,
  disabled,
  variant = 'field',
}: ThaiDatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = isoToDate(value)
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const date = isoToDate(value)
    setViewYear(date.getFullYear())
    setViewMonth(date.getMonth())
  }, [value])

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const total = daysInMonth(viewYear, viewMonth)
    const list: (string | null)[] = Array<string | null>(mondayOffset).fill(null)
    for (let day = 1; day <= total; day++) {
      list.push(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`)
    }
    return list
  }, [viewMonth, viewYear])

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear()
    const years: number[] = []
    for (let y = base - 2; y <= base + 3; y++) years.push(y)
    if (!years.includes(viewYear)) years.push(viewYear)
    return years.sort((a, b) => a - b)
  }, [viewYear])

  function moveMonth(step: number) {
    const next = new Date(viewYear, viewMonth + step, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function isDisabled(iso: string) {
    if (min && iso < min) return true
    if (max && iso > max) return true
    return false
  }

  const today = isoToday()

  return (
    <div className={`thai-date thai-date--${variant}${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="thai-date__trigger"
        disabled={disabled}
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={variant === 'bar' ? 22 : 18} aria-hidden="true" />
        <span>
          {label ? <small>{label}</small> : null}
          <strong>{formatThaiDate(value)}</strong>
        </span>
      </button>

      {open ? (
        <div className="thai-date__popover" role="dialog" aria-label="เลือกวันที่">
          <div className="thai-date__head">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => moveMonth(-1)}>
              <ChevronLeft size={18} />
            </button>
            <select
              value={viewMonth}
              onChange={(event) => setViewMonth(Number(event.target.value))}
              aria-label="เดือน"
            >
              {thaiMonths.map((name, index) => (
                <option value={index} key={name}>{name}</option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(event) => setViewYear(Number(event.target.value))}
              aria-label="ปี พ.ศ."
            >
              {yearOptions.map((year) => (
                <option value={year} key={year}>พ.ศ. {toBuddhistYear(year)}</option>
              ))}
            </select>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => moveMonth(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="thai-date__weekdays">
            {thaiWeekdaysShort.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="thai-date__grid">
            {cells.map((iso, index) =>
              iso ? (
                <button
                  type="button"
                  key={iso}
                  disabled={isDisabled(iso)}
                  className={[
                    'thai-date__day',
                    iso === value ? 'is-selected' : '',
                    iso === today ? 'is-today' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                >
                  {Number(iso.slice(-2))}
                </button>
              ) : <span key={`empty-${index}`} />,
            )}
          </div>

          <div className="thai-date__foot">
            <button
              type="button"
              disabled={isDisabled(today)}
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
            >
              วันนี้ · {formatThaiDate(today)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
