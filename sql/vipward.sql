-- =============================================================================
-- ห้องพิเศษ โรงพยาบาลไชยปราการ (vipward)
-- นำเข้าด้วย phpMyAdmin
-- =============================================================================
-- วิธีใช้:
-- 1) เข้า phpMyAdmin แล้วเลือกฐานข้อมูล cpkhospita_cpkdoctor ทางซ้าย
-- 2) กดแท็บ Import
-- 3) เลือกไฟล์นี้ แล้วกด Go / Import
--
-- ไฟล์นี้สร้างเฉพาะตารางที่ขึ้นต้น vipward_ จะไม่ลบหรือแก้ตารางอื่น
-- ถ้าตารางมีอยู่แล้ว จะข้ามการสร้าง และ INSERT ใช้ IGNORE เพื่อไม่ซ้ำ
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS vipward_settings (
  setting_key VARCHAR(64) NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_rooms (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  swatch VARCHAR(255) NOT NULL,
  tag VARCHAR(50) DEFAULT NULL,
  lane ENUM('main','alt') NOT NULL DEFAULT 'main',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vipward_rooms_lane (lane, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_packages (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  label VARCHAR(50) NOT NULL,
  details_json TEXT NOT NULL,
  price VARCHAR(100) NOT NULL,
  price_note VARCHAR(50) NOT NULL,
  tone VARCHAR(30) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_amenities (
  id VARCHAR(64) NOT NULL,
  tab_label VARCHAR(100) NOT NULL,
  tab_icon VARCHAR(20) NOT NULL,
  badge VARCHAR(100) NOT NULL,
  season_label VARCHAR(100) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  tone VARCHAR(30) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_steps (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  step_num VARCHAR(10) NOT NULL,
  title VARCHAR(191) NOT NULL,
  body_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_perks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(191) NOT NULL,
  body_text TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_rights (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  label VARCHAR(50) NOT NULL,
  is_filled TINYINT(1) NOT NULL DEFAULT 0,
  is_reward TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_room_status (
  room_id VARCHAR(64) NOT NULL,
  status_date DATE NOT NULL,
  room_status ENUM('available','reserved','occupied','cleaning','maintenance') NOT NULL DEFAULT 'available',
  internal_note VARCHAR(255) DEFAULT NULL,
  updated_by VARCHAR(100) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, status_date),
  KEY idx_vipward_status_date (status_date, room_status),
  CONSTRAINT fk_vipward_status_room
    FOREIGN KEY (room_id) REFERENCES vipward_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_admin_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vipward_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS vipward_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type ENUM('occupied','reserved','discharged','transferred','cancelled') NOT NULL,
  room_id VARCHAR(64) NOT NULL,
  related_room_id VARCHAR(64) DEFAULT NULL,
  event_date DATE NOT NULL,
  nights INT UNSIGNED NOT NULL DEFAULT 0,
  reason VARCHAR(40) DEFAULT NULL,
  internal_note VARCHAR(255) DEFAULT NULL,
  created_by VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vipward_events_date (event_date, event_type),
  KEY idx_vipward_events_room (room_id, event_date),
  CONSTRAINT fk_vipward_events_room
    FOREIGN KEY (room_id) REFERENCES vipward_rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO vipward_settings (setting_key, setting_value) VALUES
('short_name', 'CPK'),
('name', 'โรงพยาบาลไชยปราการ'),
('tagline', 'ห้องกว้าง สะอาด เป็นส่วนตัว ดูแลทั้งครอบครัว'),
('address', '131 หมู่ 3 ต.ศรีดงเย็น อ.ไชยปราการ จ.เชียงใหม่ 50320'),
('phone', '053-870-444'),
('phone_href', 'tel:053870444'),
('facebook', 'https://www.facebook.com/CPK11137/?locale=th_TH'),
('line', 'https://line.me/R/ti/p/@703vohjk'),
('website', 'https://www.cpkhospital.com'),
('hours_1', 'เปิดบริการตลอด 24 ชั่วโมง'),
('hours_2', 'สอบถามห้องว่างได้ทุกวัน');

INSERT IGNORE INTO vipward_rooms (id, name, category, description, swatch, tag, lane, sort_order, is_active) VALUES
('single', 'ห้องพิเศษ 1', 'ห้องพิเศษ', 'เตียงเดี่ยว ห้องน้ำในตัว แอร์และโทรทัศน์ เหมาะกับผู้ที่ต้องการความสงบเป็นส่วนตัว', 'radial-gradient(circle at 35% 35%, #fce4b8, #e6c68a)', 'แนะนำ', 'main', 1, 1),
('suite', 'ห้องพิเศษ 2', 'ห้องพิเศษ', 'ห้องกว้างพิเศษ พื้นที่นั่งรับแขก ตู้เย็น และบรรยากาศใกล้ธรรมชาติ', 'radial-gradient(circle at 35% 35%, #a8cfba, #5f8e73)', NULL, 'main', 2, 1),
('double', 'ห้องพิเศษ 3', 'ห้องพิเศษ', 'เหมาะกับผู้ป่วยที่ต้องการผู้ดูแลใกล้ชิด หรือพักคู่กับญาติตามข้อกำหนดของหอผู้ป่วย', 'radial-gradient(circle at 35% 35%, #c9b3d6, #9b7eb8)', NULL, 'main', 3, 1),
('elder', 'ห้องพิเศษ 4', 'ห้องพิเศษ', 'ราวจับ ห้องน้ำกันลื่น และทางเดินสะดวก เน้นความปลอดภัยในการลุกนั่ง', 'radial-gradient(circle at 35% 35%, #a8d8ea, #6bb7d4)', 'ปลอดภัย', 'main', 4, 1),
('family', 'ห้องพิเศษ 5', 'ห้องพิเศษ', 'มีพื้นที่นั่งพักและเก็บของสำหรับญาติที่เฝ้าไข้ ทำให้ดูแลผู้ป่วยได้ใกล้ชิดขึ้น', 'radial-gradient(circle at 35% 35%, #d4a76a, #b8863e)', NULL, 'main', 5, 1),
('near-nurse', 'ห้องพิเศษ VIP', 'VIP', 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา ราคา 2,500 บาท/วัน', 'radial-gradient(circle at 32% 28%, #e8c478, #6b3a2a 46%, #3e2118)', 'ยอดนิยม', 'main', 6, 1),
('garden', 'ห้องพิเศษ 7', 'ห้องพิเศษ', 'แสงธรรมชาติและมุมมองสงบ ช่วยให้พักฟื้นได้อย่างผ่อนคลาย', 'radial-gradient(circle at 35% 35%, #8b6f4e, #5c4632)', NULL, 'alt', 1, 1),
('quiet', 'ห้องพิเศษ 8', 'ห้องพิเศษ', 'ลดเสียงรบกวน เหมาะกับผู้ที่ต้องการการนอนหลับที่มีคุณภาพระหว่างรักษา', 'radial-gradient(circle at 35% 35%, #e8d5a3, #c4a96a)', NULL, 'alt', 2, 1),
('child', 'ห้องพิเศษ 9', 'ห้องพิเศษ', 'จัดพื้นที่ให้ผู้ปกครองอยู่ใกล้ชิดเด็กได้สะดวกและอบอุ่น', 'radial-gradient(circle at 35% 35%, #f7c59f, #ef8e38)', 'ครอบครัว', 'alt', 3, 1),
('wifi', 'ห้องพิเศษ 10', 'ห้องพิเศษ', 'Wi-Fi โทรทัศน์ และปลั๊กไฟใกล้เตียง สำหรับทำงานหรือติดต่อญาติ', 'radial-gradient(circle at 35% 35%, #f0c2c2, #d4868a)', NULL, 'alt', 4, 1),
('standard-plus', 'ห้องพิเศษ 11', 'ห้องพิเศษ', 'ครบเครื่องเรื่องความสะอาด แอร์ ห้องน้ำในตัว และชุดเครื่องนอนใหม่', 'radial-gradient(circle at 35% 35%, #b6d7a8, #7ab55c)', NULL, 'alt', 5, 1),
('vip', 'ห้องพิเศษ 12', 'ห้องพิเศษ', 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', 'radial-gradient(circle at 35% 35%, #f4a4b8, #e07a8a)', NULL, 'alt', 6, 1);

UPDATE vipward_rooms SET name = 'ห้องพิเศษ 1', category = 'ห้องพิเศษ', lane = 'main', sort_order = 1 WHERE id = 'single';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 2', category = 'ห้องพิเศษ', lane = 'main', sort_order = 2 WHERE id = 'suite';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 3', category = 'ห้องพิเศษ', lane = 'main', sort_order = 3 WHERE id = 'double';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 4', category = 'ห้องพิเศษ', lane = 'main', sort_order = 4 WHERE id = 'elder';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 5', category = 'ห้องพิเศษ', lane = 'main', sort_order = 5 WHERE id = 'family';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ VIP', category = 'VIP', description = 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา ราคา 2,500 บาท/วัน', lane = 'main', sort_order = 6, tag = 'ยอดนิยม', swatch = 'radial-gradient(circle at 32% 28%, #e8c478, #6b3a2a 46%, #3e2118)' WHERE id = 'near-nurse';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 7', category = 'ห้องพิเศษ', lane = 'alt', sort_order = 1 WHERE id = 'garden';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 8', category = 'ห้องพิเศษ', lane = 'alt', sort_order = 2 WHERE id = 'quiet';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 9', category = 'ห้องพิเศษ', lane = 'alt', sort_order = 3 WHERE id = 'child';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 10', category = 'ห้องพิเศษ', lane = 'alt', sort_order = 4 WHERE id = 'wifi';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 11', category = 'ห้องพิเศษ', lane = 'alt', sort_order = 5 WHERE id = 'standard-plus';
UPDATE vipward_rooms SET name = 'ห้องพิเศษ 12', category = 'ห้องพิเศษ', description = 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', lane = 'alt', sort_order = 6, tag = NULL, swatch = 'radial-gradient(circle at 35% 35%, #f4a4b8, #e07a8a)' WHERE id = 'vip';
UPDATE vipward_steps SET body_text = 'เลือกห้องพิเศษทั่วไป หรือห้องพิเศษ VIP (ห้อง 6) ตามอาการ ความต้องการของครอบครัว และห้องที่ว่างในวันนั้น' WHERE step_num = '2';

INSERT IGNORE INTO vipward_packages (id, name, description, label, details_json, price, price_note, tone, sort_order, is_active) VALUES
('standard', 'ห้องพิเศษ 1–5 และ 7–12', 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', '11 ห้อง', '["ทีวี / ไวไฟ","ตู้เย็น / โซฟา","Nurse Call","อาหารตามโภชนาการ"]', '1,500 บาท', '/ วัน', 'standard', 1, 1),
('premium', 'ห้องพิเศษ VIP', 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา', 'ห้อง 6', '["โซนเงียบ","โซฟาญาติ","ม่านบังตา","ดูแลใกล้ชิด"]', '2,500 บาท', '/ วัน', 'premium', 2, 1),
('suite', 'บริการที่รวมอยู่', 'ทุกห้องได้รับบริการพื้นฐานเดียวกัน ค่าห้องคิดตามประเภทที่เลือก', 'รวมในค่าห้อง', '["Fast Track เข้าห้อง","เคลม iClaim","ทีมพยาบาล 24 ชม.","ติดตามทาง LINE"]', 'ตามประเภทห้อง', '', 'suite', 3, 1);

UPDATE vipward_packages SET name = 'ห้องพิเศษ 1–5 และ 7–12', description = 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', label = '11 ห้อง', details_json = '["ทีวี / ไวไฟ","ตู้เย็น / โซฟา","Nurse Call","อาหารตามโภชนาการ"]', price = '1,500 บาท', price_note = '/ วัน' WHERE id = 'standard';
UPDATE vipward_packages SET name = 'ห้องพิเศษ VIP', description = 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา', label = 'ห้อง 6', details_json = '["โซนเงียบ","โซฟาญาติ","ม่านบังตา","ดูแลใกล้ชิด"]', price = '2,500 บาท', price_note = '/ วัน' WHERE id = 'premium';
UPDATE vipward_packages SET name = 'บริการที่รวมอยู่', description = 'ทุกห้องได้รับบริการพื้นฐานเดียวกัน ค่าห้องคิดตามประเภทที่เลือก', label = 'รวมในค่าห้อง', details_json = '["Fast Track เข้าห้อง","เคลม iClaim","ทีมพยาบาล 24 ชม.","ติดตามทาง LINE"]', price = 'ตามประเภทห้อง', price_note = '' WHERE id = 'suite';
UPDATE vipward_settings SET setting_value = 'ห้องกว้าง สะอาด เป็นส่วนตัว ดูแลทั้งครอบครัว' WHERE setting_key = 'tagline';

INSERT IGNORE INTO vipward_amenities (id, tab_label, tab_icon, badge, season_label, name, description, tags_json, tone, sort_order, is_active) VALUES
('privacy', 'ความเป็นส่วนตัว', '◎', 'ห้องเดี่ยว / VIP', 'บรรยากาศการพักฟื้น', 'เงียบ สงบ และเป็นของคุณ', 'ห้องพิเศษออกแบบให้ผู้ป่วยได้พักโดยไม่ถูกรบกวน ม่านบังตา ห้องน้ำในตัว และพื้นที่ส่วนตัวสำหรับพูดคุยกับแพทย์หรือครอบครัว', '[{"icon":"▣","text":"ห้องเดี่ยว"},{"icon":"✧","text":"ม่านบังตา"},{"icon":"♥","text":"พื้นที่ครอบครัว"}]', 'privacy', 1, 1),
('comfort', 'ความสะดวก', '✦', 'สิ่งอำนวยความสะดวก', 'อยู่สบายระหว่างรักษา', 'ครบเครื่องเรื่องความสะดวก', 'เตียงปรับระดับ แอร์ โทรทัศน์ ตู้เย็น และอินเทอร์เน็ต เพื่อให้ทั้งผู้ป่วยและญาติใช้ชีวิตประจำวันได้สะดวกระหว่างพักรักษาตัว', '[{"icon":"▣","text":"เตียงปรับระดับ"},{"icon":"✧","text":"TV / Wi-Fi"},{"icon":"♥","text":"ตู้เย็น"}]', 'comfort', 2, 1),
('safety', 'ความปลอดภัย', '+', 'ดูแลใกล้ชิด', 'มาตรฐานโรงพยาบาล', 'ปลอดภัยในทุกจังหวะการดูแล', 'ระบบเรียกพยาบาล ราวจับในห้องน้ำ และทีมเวรที่พร้อมเข้าถึงห้องได้อย่างรวดเร็ว โดยเฉพาะผู้สูงอายุและผู้ป่วยที่ต้องสังเกตอาการ', '[{"icon":"▣","text":"ปุ่มเรียกพยาบาล"},{"icon":"✧","text":"กันลื่น"},{"icon":"♥","text":"เวร 24 ชม."}]', 'safety', 3, 1),
('family', 'ญาติผู้ดูแล', '♡', 'พื้นที่สำหรับครอบครัว', 'เฝ้าไข้ได้อย่างอบอุ่น', 'ญาติได้อยู่ใกล้ โดยไม่แออัด', 'มีที่นั่งพัก เก็บสัมภาระ และใช้ไฟฟ้าชาร์จอุปกรณ์ เพื่อให้ผู้ดูแลอยู่กับผู้ป่วยได้อย่างสบาย โดยไม่รบกวนการรักษา', '[{"icon":"▣","text":"โซฟาญาติ"},{"icon":"✧","text":"ที่เก็บของ"},{"icon":"♥","text":"เฝ้าไข้ได้"}]', 'family', 4, 1);

INSERT INTO vipward_steps (step_num, title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT '1' AS step_num, 'ติดต่อเจ้าหน้าที่' AS title, 'สอบถามห้องว่างได้ที่เวชระเบียน หอผู้ป่วย หรือโทร 053-870-444 ได้ตลอด 24 ชั่วโมง' AS body_text, 1 AS sort_order, 1 AS is_active
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_steps LIMIT 1);

INSERT INTO vipward_steps (step_num, title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT '2', 'เลือกประเภทห้อง', 'เลือกห้องพิเศษทั่วไป หรือห้องพิเศษ VIP (ห้อง 6) ตามอาการ ความต้องการของครอบครัว และห้องที่ว่างในวันนั้น', 2, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_steps WHERE step_num = '2');

INSERT INTO vipward_steps (step_num, title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT '3', 'ยืนยันสิทธิ์และค่าใช้จ่าย', 'เจ้าหน้าที่ช่วยตรวจสอบสิทธิ์บัตรทอง ประกันสังคม ข้าราชการ ประกันเอกชน หรือชำระเอง', 3, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_steps WHERE step_num = '3');

INSERT INTO vipward_steps (step_num, title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT '4', 'เข้าพักและรับการดูแล', 'ทีมแพทย์และพยาบาลรับเข้าหอผู้ป่วย จัดเตียง และดูแลอย่างต่อเนื่องจนกว่าจะจำหน่าย', 4, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_steps WHERE step_num = '4');

INSERT INTO vipward_perks (title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT 'ทีมดูแลใกล้ชิด' AS title, 'แพทย์และพยาบาลหอผู้ป่วยพร้อมสังเกตอาการ และตอบคำถามครอบครัวได้ตลอดเวลา' AS body_text, 1 AS sort_order, 1 AS is_active
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_perks LIMIT 1);

INSERT INTO vipward_perks (title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT 'สะอาด เงียบ เป็นระเบียบ', 'ห้องพิเศษเน้นความสงบและความสะอาด เพื่อให้ผู้ป่วยได้พักฟื้นอย่างมีคุณภาพ', 2, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_perks WHERE title = 'สะอาด เงียบ เป็นระเบียบ');

INSERT INTO vipward_perks (title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT 'ใช้สิทธิ์การรักษาได้', 'สอบถามการใช้สิทธิ์บัตรทอง ประกันสังคม ข้าราชการ ประกันเอกชน หรือชำระเองได้ที่เจ้าหน้าที่', 3, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_perks WHERE title = 'ใช้สิทธิ์การรักษาได้');

INSERT INTO vipward_perks (title, body_text, sort_order, is_active)
SELECT * FROM (
  SELECT 'สอบถามห้องว่าง 24 ชม.', 'โทร 053-870-444 หรือติดต่อหอผู้ป่วยเมื่อมีแผนเข้าพักหรือย้ายจากห้องสามัญ', 4, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_perks WHERE title = 'สอบถามห้องว่าง 24 ชม.');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'บัตรทอง' AS label, 1 AS is_filled, 0 AS is_reward, 1 AS sort_order, 1 AS is_active
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights LIMIT 1);

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'ปกส.', 1, 0, 2, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'ปกส.');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'ข้าราชการ', 1, 0, 3, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'ข้าราชการ');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'ประกัน', 1, 0, 4, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'ประกัน');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'จ่ายเอง', 1, 1, 5, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'จ่ายเอง');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'OPD', 1, 0, 6, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'OPD');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'IPD', 1, 0, 7, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'IPD');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'ฉุกเฉิน', 0, 0, 8, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'ฉุกเฉิน');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'นัดหมาย', 0, 0, 9, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'นัดหมาย');

INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order, is_active)
SELECT * FROM (
  SELECT 'สอบถาม', 0, 1, 10, 1
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM vipward_rights WHERE label = 'สอบถาม');
