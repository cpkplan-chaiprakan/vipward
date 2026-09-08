import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const hosting = join(root, 'hosting')

rmSync(hosting, { recursive: true, force: true })
mkdirSync(hosting, { recursive: true })

cpSync(join(root, 'dist'), hosting, { recursive: true })
cpSync(join(root, 'api'), join(hosting, 'api'), { recursive: true })

console.log('เตรียมโฟลเดอร์ hosting/ แล้ว')
console.log('อัปโหลดเนื้อใน hosting/ ไปที่ public_html/vipward ด้วย FileZilla')
console.log('ไฟล์ SQL สำหรับ phpMyAdmin อยู่ที่ sql/vipward.sql (อย่าอัปโหลดขึ้นเว็บ)')
