import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const hosting = join(root, 'hosting')
const bundle = join(hosting, 'vipward')

rmSync(hosting, { recursive: true, force: true })
mkdirSync(bundle, { recursive: true })

cpSync(join(root, 'dist'), bundle, { recursive: true })
cpSync(join(root, 'api'), join(bundle, 'api'), { recursive: true })

const localConfig = join(root, 'api', 'config.local.php')
if (!existsSync(localConfig)) {
  console.warn('ยังไม่มี api/config.local.php — คัดลอกจาก api/config.local.php.example แล้วใส่รหัสผ่านก่อนอัปโหลด')
}

console.log('เตรียมโฟลเดอร์ hosting/vipward แล้ว')
console.log('ใน FileZilla เปิด public_html แล้วลากโฟลเดอร์ vipward ทั้งก้อนเข้าไป')
console.log('ไฟล์ SQL สำหรับ phpMyAdmin อยู่ที่ sql/vipward.sql (อย่าอัปโหลดขึ้นเว็บ)')
