<?php
/**
 * สร้างตาราง vipward_* ในฐาน cpkhospita_project ถ้ายังไม่มี
 * และใส่ข้อมูลเริ่มต้นเฉพาะตารางที่ยังว่าง
 *
 * รันจาก Docker entrypoint หรือ: php api/migrate.php
 */
declare(strict_types=1);

require __DIR__ . '/connect.php';

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'รันผ่าน command line เท่านั้น';
    exit;
}

$conn = vipward_connect();

$statements = [
    "CREATE TABLE IF NOT EXISTS vipward_settings (
        setting_key VARCHAR(64) NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_rooms (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_packages (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_amenities (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_steps (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        step_num VARCHAR(10) NOT NULL,
        title VARCHAR(191) NOT NULL,
        body_text TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_perks (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(191) NOT NULL,
        body_text TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_rights (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        label VARCHAR(50) NOT NULL,
        is_filled TINYINT(1) NOT NULL DEFAULT 0,
        is_reward TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_room_status (
        room_id VARCHAR(64) NOT NULL,
        status_date DATE NOT NULL,
        room_status ENUM('available','reserved','occupied','cleaning','maintenance') NOT NULL DEFAULT 'available',
        internal_note VARCHAR(255) DEFAULT NULL,
        updated_by VARCHAR(100) DEFAULT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, status_date),
        KEY idx_vipward_status_date (status_date, room_status),
        CONSTRAINT fk_vipward_status_room FOREIGN KEY (room_id) REFERENCES vipward_rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_admin_users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(80) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(150) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_vipward_admin_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

    "CREATE TABLE IF NOT EXISTS vipward_events (
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
        CONSTRAINT fk_vipward_events_room FOREIGN KEY (room_id) REFERENCES vipward_rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
];

foreach ($statements as $sql) {
    if (!$conn->query($sql)) {
        fwrite(STDERR, "สร้างตารางไม่สำเร็จ: {$conn->error}\n");
        exit(1);
    }
}

function vipward_table_empty(mysqli $conn, string $table): bool
{
    $result = $conn->query("SELECT COUNT(*) AS total FROM `{$table}`");
    if (!$result) {
        return true;
    }
    $row = $result->fetch_assoc();
    return intval($row['total'] ?? 0) === 0;
}

function vipward_exec(mysqli $conn, string $sql, string $types = '', array $params = []): void
{
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException($conn->error);
    }
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    if (!$stmt->execute()) {
        throw new RuntimeException($stmt->error);
    }
    $stmt->close();
}

$settings = [
    'short_name' => 'CPK',
    'name' => 'โรงพยาบาลไชยปราการ',
    'tagline' => 'ห้องกว้าง สะอาด เป็นส่วนตัว ดูแลทั้งครอบครัว',
    'address' => '131 หมู่ 3 ต.ศรีดงเย็น อ.ไชยปราการ จ.เชียงใหม่ 50320',
    'phone' => '053-870-444',
    'phone_href' => 'tel:053870444',
    'facebook' => 'https://www.facebook.com/CPK11137/?locale=th_TH',
    'line' => 'https://line.me/R/ti/p/@703vohjk',
    'website' => 'https://www.cpkhospital.com',
    'hours_1' => 'เปิดบริการตลอด 24 ชั่วโมง',
    'hours_2' => 'สอบถามห้องว่างได้ทุกวัน',
];

$rooms = [
    ['single', 'ห้องพิเศษ 1', 'ห้องพิเศษ', 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น และโซฟา สำหรับพักฟื้นอย่างสงบ', 'radial-gradient(circle at 35% 35%, #fce4b8, #e6c68a)', 'แนะนำ', 'main', 1],
    ['suite', 'ห้องพิเศษ 2', 'ห้องพิเศษ', 'ห้องโล่ง เป็นระเบียบ มีโซฟานั่งพักและตู้เย็น เหมาะกับครอบครัวที่เฝ้าไข้', 'radial-gradient(circle at 35% 35%, #a8cfba, #5f8e73)', '', 'main', 2],
    ['double', 'ห้องพิเศษ 3', 'ห้องพิเศษ', 'ให้ญาติอยู่ใกล้ชิดได้สะดวก โดยยังมีความเป็นส่วนตัวระหว่างการรักษา', 'radial-gradient(circle at 35% 35%, #c9b3d6, #9b7eb8)', '', 'main', 3],
    ['elder', 'ห้องพิเศษ 4', 'ห้องพิเศษ', 'เน้นความปลอดภัยสำหรับผู้สูงอายุ มีราวจับ ห้องน้ำกันลื่น และเรียกพยาบาลได้ตลอด 24 ชั่วโมง', 'radial-gradient(circle at 35% 35%, #a8d8ea, #6bb7d4)', 'ปลอดภัย', 'main', 4],
    ['family', 'ห้องพิเศษ 5', 'ห้องพิเศษ', 'มีพื้นที่ให้ครอบครัวเฝ้าไข้ได้อย่างอบอุ่น ไม่แออัด และไม่รบกวนการพักผ่อน', 'radial-gradient(circle at 35% 35%, #d4a76a, #b8863e)', '', 'main', 5],
    ['near-nurse', 'ห้องพิเศษ VIP', 'VIP', 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา ราคา 2,500 บาท/วัน', 'radial-gradient(circle at 32% 28%, #e8c478, #6b3a2a 46%, #3e2118)', 'ยอดนิยม', 'main', 6],
    ['garden', 'ห้องพิเศษ 7', 'ห้องพิเศษ', 'บรรยากาศสงบ แสงธรรมชาติ ช่วยให้ผู้ป่วยและครอบครัวได้พักอย่างผ่อนคลาย', 'radial-gradient(circle at 35% 35%, #8b6f4e, #5c4632)', '', 'alt', 1],
    ['quiet', 'ห้องพิเศษ 8', 'ห้องพิเศษ', 'ห้องเงียบ เป็นส่วนตัว เหมาะกับการพักฟื้นและการดูแลแบบประคับประคอง', 'radial-gradient(circle at 35% 35%, #e8d5a3, #c4a96a)', '', 'alt', 2],
    ['child', 'ห้องพิเศษ 9', 'ห้องพิเศษ', 'จัดพื้นที่ให้อบอุ่น ครอบครัวอยู่ใกล้ผู้ป่วยได้โดยสะดวก', 'radial-gradient(circle at 35% 35%, #f7c59f, #ef8e38)', 'ครอบครัว', 'alt', 3],
    ['wifi', 'ห้องพิเศษ 10', 'ห้องพิเศษ', 'มีทีวี ไวไฟ ตู้เย็น และปลั๊กไฟใกล้เตียง ติดต่อญาติหรือพักผ่อนได้สะดวก', 'radial-gradient(circle at 35% 35%, #f0c2c2, #d4868a)', '', 'alt', 4],
    ['standard-plus', 'ห้องพิเศษ 11', 'ห้องพิเศษ', 'สิ่งอำนวยความสะดวกครบ ห้องน้ำในตัว แอร์ และมาตรฐานความสะอาดของโรงพยาบาล', 'radial-gradient(circle at 35% 35%, #b6d7a8, #7ab55c)', '', 'alt', 5],
    ['vip', 'ห้องพิเศษ 12', 'ห้องพิเศษ', 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', 'radial-gradient(circle at 35% 35%, #f4a4b8, #e07a8a)', '', 'alt', 6],
];

$packages = [
    ['standard', 'ห้องพิเศษ 1–5 และ 7–12', 'ห้องกว้าง สะอาด เป็นส่วนตัว มีทีวี ไวไฟ ตู้เย็น โซฟา และระบบเรียกพยาบาล 24 ชั่วโมง', '11 ห้อง', json_encode(['ทีวี / ไวไฟ', 'ตู้เย็น / โซฟา', 'Nurse Call', 'อาหารตามโภชนาการ'], JSON_UNESCAPED_UNICODE), '1,500 บาท', '/ วัน', 'standard', 1],
    ['premium', 'ห้องพิเศษ VIP', 'ห้องพิเศษหมายเลข 6 โซนเงียบ เป็นส่วนตัวสูง มีโซฟาญาติและม่านบังตา', 'ห้อง 6', json_encode(['โซนเงียบ', 'โซฟาญาติ', 'ม่านบังตา', 'ดูแลใกล้ชิด'], JSON_UNESCAPED_UNICODE), '2,500 บาท', '/ วัน', 'premium', 2],
    ['suite', 'บริการที่รวมอยู่', 'ทุกห้องได้รับบริการพื้นฐานเดียวกัน ค่าห้องคิดตามประเภทที่เลือก', 'รวมในค่าห้อง', json_encode(['Fast Track เข้าห้อง', 'เคลม iClaim', 'ทีมพยาบาล 24 ชม.', 'ติดตามทาง LINE'], JSON_UNESCAPED_UNICODE), 'ตามประเภทห้อง', '', 'suite', 3],
];

$amenities = [
    ['privacy', 'ความเป็นส่วนตัว', '◎', 'ห้องกว้าง สะอาด', 'บรรยากาศการพักฟื้น', 'เงียบ สงบ และเป็นส่วนตัว', 'ห้องพิเศษทั้ง 12 ห้องออกแบบให้กว้าง สะอาด และเป็นส่วนตัว เพื่อให้ผู้ป่วยได้พักโดยไม่ถูกรบกวน และครอบครัวได้อยู่ใกล้ได้อย่างสบาย', json_encode([['icon' => '▣', 'text' => 'ห้องกว้าง'], ['icon' => '✧', 'text' => 'ความเป็นส่วนตัว'], ['icon' => '♥', 'text' => 'สะอาด เป็นระเบียบ']], JSON_UNESCAPED_UNICODE), 'privacy', 1],
    ['comfort', 'ความสะดวก', '✦', 'สิ่งอำนวยความสะดวกครบ', 'อยู่สบายระหว่างรักษา', 'ครบเครื่องเรื่องความสะดวก', 'มีทีวี ไวไฟ ตู้เย็น โซฟา และอาหารตามหลักโภชนาการ เพื่อให้ทั้งผู้ป่วยและญาติใช้ชีวิตประจำวันได้สะดวกระหว่างพักรักษาตัว', json_encode([['icon' => '▣', 'text' => 'ทีวี / ไวไฟ'], ['icon' => '✧', 'text' => 'ตู้เย็น / โซฟา'], ['icon' => '♥', 'text' => 'อาหารตามโภชนาการ']], JSON_UNESCAPED_UNICODE), 'comfort', 2],
    ['safety', 'ความปลอดภัย', '+', 'Nurse Call 24 ชม.', 'มาตรฐานโรงพยาบาล', 'ปลอดภัยในทุกจังหวะการดูแล', 'มีระบบความปลอดภัยและปุ่มเรียกพยาบาลตลอด 24 ชั่วโมง ทีมเวรเข้าถึงห้องได้รวดเร็ว เหมาะกับผู้สูงอายุและผู้ป่วยที่ต้องสังเกตอาการใกล้ชิด', json_encode([['icon' => '▣', 'text' => 'Nurse Call'], ['icon' => '✧', 'text' => 'เวร 24 ชม.'], ['icon' => '♥', 'text' => 'ดูแลผู้สูงอายุ']], JSON_UNESCAPED_UNICODE), 'safety', 3],
    ['family', 'ครอบครัว', '♡', 'ดูแลทั้งครอบครัว', 'เฝ้าไข้ได้อย่างอบอุ่น', 'ดูแลผู้ป่วย และอยู่กับครอบครัว', 'บริการแบบ Personal Care ให้ญาติเฝ้าไข้ได้ใกล้ชิด หลังจำหน่ายยังติดตามทางโทรศัพท์หรือ LINE และรับฟังความพึงพอใจเพื่อพัฒนาบริการต่อเนื่อง', json_encode([['icon' => '▣', 'text' => 'Personal Care'], ['icon' => '✧', 'text' => 'โซฟาญาติ'], ['icon' => '♥', 'text' => 'ติดตามทาง LINE']], JSON_UNESCAPED_UNICODE), 'family', 4],
];

$steps = [
    ['1', 'ติดต่อเจ้าหน้าที่', 'สอบถามได้ที่ห้องฉุกเฉิน ห้องตรวจ หอผู้ป่วย โทร 053-870-444 หรือ LINE โรงพยาบาล ได้ตลอด 24 ชั่วโมง', 1],
    ['2', 'เลือกห้องพิเศษ', 'เลือกห้องพิเศษทั่วไป หรือห้องพิเศษ VIP (ห้อง 6) ตามอาการ ความต้องการของครอบครัว และห้องที่ว่างในวันนั้น', 2],
    ['3', 'ตรวจสอบสิทธิ์และเคลม', 'เจ้าหน้าที่ช่วยตรวจสิทธิ์ข้าราชการ บัตรทอง ประกันสังคม ประกันเอกชน หรือชำระเอง พร้อมใช้ iClaim เพื่อลดเอกสาร', 3],
    ['4', 'เข้าพักและดูแลต่อเนื่อง', 'ทีมพยาบาลดูแลแบบใกล้ชิด เข้าห้องด้วย Fast Track จากนั้นติดตามความพึงพอใจทางโทรศัพท์หรือ LINE', 4],
];

$perks = [
    ['ห้องสะอาด กว้าง เป็นส่วนตัว', 'ทั้ง 12 ห้องจัดอย่างเป็นระเบียบ ให้ผู้ป่วยได้พักฟื้นอย่างมีคุณภาพ และครอบครัวได้อยู่ใกล้โดยไม่อึดอัด', 1],
    ['ทีมพยาบาลอบอุ่น เป็นมืออาชีพ', 'แพทย์ พยาบาล และเจ้าหน้าที่บริการดูแลใกล้ชิด ตอบคำถามครอบครัวได้ตลอดเวลา', 2],
    ['เข้าห้องไว เคลมสะดวก', 'มี Fast Track สำหรับเข้าห้องพิเศษ และใช้ iClaim ช่วยลดเอกสารเมื่อใช้สิทธิ์ประกัน', 3],
    ['ค่าห้องชัดเจน 2 อัตรา', 'ห้องพิเศษทั่วไป 1,500 บาท/วัน และห้องพิเศษ VIP (ห้อง 6) 2,500 บาท/วัน สอบถามห้องว่างได้ที่ 053-870-444', 4],
];

$rights = [
    ['ข้าราชการ', 1, 0, 1],
    ['บัตรทอง', 1, 0, 2],
    ['ปกส.', 1, 0, 3],
    ['ประกัน', 1, 0, 4],
    ['จ่ายเอง', 1, 1, 5],
    ['ผู้สูงอายุ', 1, 0, 6],
    ['คนในพื้นที่', 1, 0, 7],
    ['IPD', 1, 0, 8],
    ['Fast Track', 0, 0, 9],
    ['iClaim', 0, 1, 10],
];

if (vipward_table_empty($conn, 'vipward_settings')) {
    foreach ($settings as $key => $value) {
        vipward_exec($conn, 'INSERT INTO vipward_settings (setting_key, setting_value) VALUES (?, ?)', 'ss', [$key, $value]);
    }
}

if (vipward_table_empty($conn, 'vipward_rooms')) {
    foreach ($rooms as $room) {
        vipward_exec($conn, 'INSERT INTO vipward_rooms (id, name, category, description, swatch, tag, lane, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 'sssssssi', $room);
    }
}

if (vipward_table_empty($conn, 'vipward_packages')) {
    foreach ($packages as $pkg) {
        vipward_exec($conn, 'INSERT INTO vipward_packages (id, name, description, label, details_json, price, price_note, tone, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 'ssssssssi', $pkg);
    }
}

if (vipward_table_empty($conn, 'vipward_amenities')) {
    foreach ($amenities as $item) {
        vipward_exec($conn, 'INSERT INTO vipward_amenities (id, tab_label, tab_icon, badge, season_label, name, description, tags_json, tone, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 'sssssssssi', $item);
    }
}

if (vipward_table_empty($conn, 'vipward_steps')) {
    foreach ($steps as $step) {
        vipward_exec($conn, 'INSERT INTO vipward_steps (step_num, title, body_text, sort_order) VALUES (?, ?, ?, ?)', 'sssi', $step);
    }
}

if (vipward_table_empty($conn, 'vipward_perks')) {
    foreach ($perks as $perk) {
        vipward_exec($conn, 'INSERT INTO vipward_perks (title, body_text, sort_order) VALUES (?, ?, ?)', 'ssi', $perk);
    }
}

if (vipward_table_empty($conn, 'vipward_rights')) {
    foreach ($rights as $right) {
        vipward_exec($conn, 'INSERT INTO vipward_rights (label, is_filled, is_reward, sort_order) VALUES (?, ?, ?, ?)', 'siii', $right);
    }
}

foreach ($settings as $key => $value) {
    vipward_exec($conn, 'UPDATE vipward_settings SET setting_value = ? WHERE setting_key = ?', 'ss', [$value, $key]);
}

foreach ($rooms as $room) {
    vipward_exec(
        $conn,
        'UPDATE vipward_rooms SET name = ?, category = ?, description = ?, swatch = ?, tag = ?, lane = ?, sort_order = ? WHERE id = ?',
        'ssssssis',
        [$room[1], $room[2], $room[3], $room[4], $room[5], $room[6], $room[7], $room[0]]
    );
}

foreach ($packages as $pkg) {
    vipward_exec(
        $conn,
        'UPDATE vipward_packages SET name = ?, description = ?, label = ?, details_json = ?, price = ?, price_note = ?, tone = ?, sort_order = ? WHERE id = ?',
        'sssssssis',
        [$pkg[1], $pkg[2], $pkg[3], $pkg[4], $pkg[5], $pkg[6], $pkg[7], $pkg[8], $pkg[0]]
    );
}

foreach ($amenities as $item) {
    vipward_exec(
        $conn,
        'UPDATE vipward_amenities SET tab_label = ?, tab_icon = ?, badge = ?, season_label = ?, name = ?, description = ?, tags_json = ?, tone = ?, sort_order = ? WHERE id = ?',
        'ssssssssis',
        [$item[1], $item[2], $item[3], $item[4], $item[5], $item[6], $item[7], $item[8], $item[9], $item[0]]
    );
}

foreach ($steps as $step) {
    vipward_exec($conn, 'UPDATE vipward_steps SET title = ?, body_text = ?, sort_order = ? WHERE step_num = ?', 'ssis', [$step[1], $step[2], $step[3], $step[0]]);
}

foreach ($perks as $perk) {
    vipward_exec($conn, 'UPDATE vipward_perks SET title = ?, body_text = ? WHERE sort_order = ?', 'ssi', $perk);
}

foreach ($rights as $right) {
    vipward_exec($conn, 'UPDATE vipward_rights SET label = ?, is_filled = ?, is_reward = ? WHERE sort_order = ?', 'siii', $right);
}

echo 'vipward migrate ok: tables ready in ' . vipward_db_name() . "\n";

