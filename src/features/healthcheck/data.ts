import type { NavItem } from '../../types'
import type { HealthcheckPeriod, HealthcheckStatus } from './types'

export const healthcheckNav: NavItem[] = [
  { href: '#hc-hero', label: 'หน้าแรก', icon: 'home' },
  { href: '#hc-packages', label: 'แพ็กเกจตรวจสุขภาพ', icon: 'pulse' },
  { href: '#hc-request', label: 'ขอนัดตรวจสุขภาพ', icon: 'request' },
  { href: '#hc-status', label: 'เช็กสถานะคำขอ', icon: 'status' },
  { href: '#hc-steps', label: 'ขั้นตอนการตรวจ', icon: 'process' },
]

export const healthcheckTagline = 'ตรวจสุขภาพประจำปี นัดล่วงหน้าได้ ไม่ต้องรอนาน'

export const healthcheckHours = ['ส่งคำขอนัดผ่านเว็บได้ทุกวัน', 'เจ้าหน้าที่โทรยืนยันวันนัด']

export const periodLabel: Record<HealthcheckPeriod, string> = {
  morning: 'ช่วงเช้า',
  afternoon: 'ช่วงบ่าย',
}

export const statusMeta: Record<HealthcheckStatus, { label: string; publicText: string; tone: string }> = {
  pending: {
    label: 'รอยืนยัน',
    publicText: 'ได้รับคำขอแล้ว เจ้าหน้าที่กำลังตรวจสอบและจะโทรยืนยันวันนัด',
    tone: 'pending',
  },
  confirmed: {
    label: 'ยืนยันแล้ว',
    publicText: 'ยืนยันวันนัดตามที่ขอแล้ว',
    tone: 'confirmed',
  },
  rescheduled: {
    label: 'นัดวันใหม่',
    publicText: 'เจ้าหน้าที่นัดวันใหม่ให้ ตรวจสอบวันนัดด้านล่าง',
    tone: 'rescheduled',
  },
  rejected: {
    label: 'ไม่สามารถนัดได้',
    publicText: 'ไม่สามารถรับนัดตามคำขอนี้ได้ ดูหมายเหตุจากเจ้าหน้าที่',
    tone: 'rejected',
  },
  completed: {
    label: 'ตรวจเรียบร้อย',
    publicText: 'ตรวจสุขภาพเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ',
    tone: 'completed',
  },
  cancelled: {
    label: 'ยกเลิก',
    publicText: 'คำขอนี้ถูกยกเลิกแล้ว',
    tone: 'cancelled',
  },
}

export const healthcheckSteps = [
  {
    num: '1',
    title: 'เลือกแพ็กเกจและวันที่',
    text: 'เลือกแพ็กเกจที่เหมาะกับวัย แล้วระบุวันและช่วงเวลาที่สะดวก ส่งคำขอได้ทุกวันผ่านเว็บนี้',
  },
  {
    num: '2',
    title: 'รอเจ้าหน้าที่ยืนยัน',
    text: 'พยาบาลตรวจสอบคิวและโทรยืนยันวันนัด หากวันนั้นเต็มจะแจ้งวันใหม่ที่ใกล้เคียงให้',
  },
  {
    num: '3',
    title: 'เตรียมตัวก่อนตรวจ',
    text: 'แพ็กเกจที่มีตรวจน้ำตาลหรือไขมันในเลือด ควรงดอาหารและเครื่องดื่มยกเว้นน้ำเปล่าอย่างน้อย 8 ชั่วโมง',
  },
  {
    num: '4',
    title: 'มาตรวจตามวันนัด',
    text: 'นำบัตรประชาชนมาด้วย แจ้งรหัสคำขอที่จุดลงทะเบียน เจ้าหน้าที่จะพาตรวจตามรายการในแพ็กเกจ',
  },
]
