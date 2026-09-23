-- =============================================================================
-- ตรวจสุขภาพ โรงพยาบาลไชยปราการ (healthcheck)
-- นำเข้าด้วย phpMyAdmin
-- =============================================================================
-- วิธีใช้:
-- 1) เข้า phpMyAdmin แล้วเลือกฐานข้อมูล cpkhospita_project ทางซ้าย
-- 2) กดแท็บ Import
-- 3) เลือกไฟล์นี้ แล้วกด Go / Import
--
-- ไฟล์นี้สร้างเฉพาะตารางที่ขึ้นต้น healthcheck_ จะไม่ลบหรือแก้ตารางอื่น
-- นำเข้าซ้ำได้ ตารางที่มีอยู่แล้วจะถูกข้าม และแพ็กเกจตัวอย่างใส่เฉพาะตอนตารางยังว่าง
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS healthcheck_packages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  items_json TEXT NOT NULL,
  price VARCHAR(100) NOT NULL,
  price_note VARCHAR(50) NOT NULL DEFAULT '',
  tag VARCHAR(50) DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_healthcheck_packages_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS healthcheck_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ref_code VARCHAR(20) NOT NULL,
  package_id INT UNSIGNED DEFAULT NULL,
  package_name VARCHAR(191) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  birth_date DATE DEFAULT NULL,
  note VARCHAR(500) DEFAULT NULL,
  preferred_date DATE NOT NULL,
  preferred_period ENUM('morning','afternoon') NOT NULL DEFAULT 'morning',
  confirmed_date DATE DEFAULT NULL,
  confirmed_period ENUM('morning','afternoon') DEFAULT NULL,
  status ENUM('pending','confirmed','rescheduled','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
  staff_note VARCHAR(500) DEFAULT NULL,
  handled_by VARCHAR(100) DEFAULT NULL,
  client_hash CHAR(64) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_healthcheck_requests_ref (ref_code),
  KEY idx_healthcheck_requests_status (status, preferred_date),
  KEY idx_healthcheck_requests_confirmed (confirmed_date, status),
  KEY idx_healthcheck_requests_phone (phone, created_at),
  KEY idx_healthcheck_requests_client (client_hash, created_at),
  CONSTRAINT fk_healthcheck_requests_package
    FOREIGN KEY (package_id) REFERENCES healthcheck_packages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO healthcheck_packages (name, description, items_json, price, price_note, tag, sort_order, is_active)
SELECT * FROM (
  SELECT
    'ตรวจสุขภาพพื้นฐาน' AS name,
    'เหมาะกับวัยทำงานที่อยากรู้ค่าสุขภาพเบื้องต้น ใช้เวลาไม่นาน' AS description,
    '["ซักประวัติ วัดความดัน ชั่งน้ำหนัก","ความสมบูรณ์ของเลือด (CBC)","น้ำตาลในเลือด (FBS)","ตรวจปัสสาวะ"]' AS items_json,
    'สอบถามราคา' AS price,
    '' AS price_note,
    NULL AS tag,
    1 AS sort_order,
    1 AS is_active
  UNION ALL SELECT
    'ตรวจสุขภาพประจำปี',
    'ตรวจครบทั้งเลือด ไขมัน ตับ ไต และเอกซเรย์ปอด เหมาะกับการตรวจทุกปี',
    '["ทุกรายการในแพ็กเกจพื้นฐาน","ไขมันในเลือด","การทำงานของตับและไต","เอกซเรย์ปอด"]',
    'สอบถามราคา',
    '',
    'แนะนำ',
    2,
    1
  UNION ALL SELECT
    'ตรวจสุขภาพผู้สูงอายุ 60+',
    'เพิ่มการตรวจหัวใจและกรดยูริก พร้อมปรึกษาแพทย์ สำหรับผู้สูงอายุ',
    '["ทุกรายการในแพ็กเกจประจำปี","คลื่นไฟฟ้าหัวใจ (EKG)","กรดยูริก","ปรึกษาแพทย์หลังตรวจ"]',
    'สอบถามราคา',
    '',
    NULL,
    3,
    1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM healthcheck_packages LIMIT 1);
