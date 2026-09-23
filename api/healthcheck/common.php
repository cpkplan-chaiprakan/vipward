<?php
/**
 * ตัวช่วยร่วมของระบบตรวจสุขภาพ (ตาราง healthcheck_*)
 */
declare(strict_types=1);

const HEALTHCHECK_STATUSES = ['pending', 'confirmed', 'rescheduled', 'rejected', 'completed', 'cancelled'];
const HEALTHCHECK_PERIODS = ['morning', 'afternoon'];

function healthcheck_schema(): array
{
    return [
        "CREATE TABLE IF NOT EXISTS healthcheck_packages (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

        "CREATE TABLE IF NOT EXISTS healthcheck_requests (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}

function healthcheck_seed_packages(mysqli $conn): void
{
    $result = $conn->query('SELECT COUNT(*) AS total FROM healthcheck_packages');
    if (!$result || intval($result->fetch_assoc()['total'] ?? 0) > 0) {
        return;
    }

    $seed = [
        ['ตรวจสุขภาพพื้นฐาน', 'เหมาะกับวัยทำงานที่อยากรู้ค่าสุขภาพเบื้องต้น ใช้เวลาไม่นาน', ['ซักประวัติ วัดความดัน ชั่งน้ำหนัก', 'ความสมบูรณ์ของเลือด (CBC)', 'น้ำตาลในเลือด (FBS)', 'ตรวจปัสสาวะ'], null, 1],
        ['ตรวจสุขภาพประจำปี', 'ตรวจครบทั้งเลือด ไขมัน ตับ ไต และเอกซเรย์ปอด เหมาะกับการตรวจทุกปี', ['ทุกรายการในแพ็กเกจพื้นฐาน', 'ไขมันในเลือด', 'การทำงานของตับและไต', 'เอกซเรย์ปอด'], 'แนะนำ', 2],
        ['ตรวจสุขภาพผู้สูงอายุ 60+', 'เพิ่มการตรวจหัวใจและกรดยูริก พร้อมปรึกษาแพทย์ สำหรับผู้สูงอายุ', ['ทุกรายการในแพ็กเกจประจำปี', 'คลื่นไฟฟ้าหัวใจ (EKG)', 'กรดยูริก', 'ปรึกษาแพทย์หลังตรวจ'], null, 3],
    ];

    $stmt = $conn->prepare(
        "INSERT INTO healthcheck_packages (name, description, items_json, price, price_note, tag, sort_order, is_active)
         VALUES (?, ?, ?, 'สอบถามราคา', '', ?, ?, 1)"
    );
    foreach ($seed as [$name, $description, $items, $tag, $order]) {
        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);
        $stmt->bind_param('ssssi', $name, $description, $itemsJson, $tag, $order);
        $stmt->execute();
    }
}

function healthcheck_ensure_tables(mysqli $conn): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    foreach (healthcheck_schema() as $sql) {
        if (!$conn->query($sql)) {
            throw new RuntimeException('healthcheck schema failed');
        }
    }
    healthcheck_seed_packages($conn);
    $ready = true;
}

function healthcheck_require_db(bool $dbReady, ?mysqli $conn): mysqli
{
    if (!$dbReady || !$conn instanceof mysqli) {
        vip_json(['ok' => false, 'message' => 'ยังไม่สามารถเชื่อมฐานข้อมูลได้ กรุณาโทร 053-870-444'], 503);
    }
    try {
        healthcheck_ensure_tables($conn);
    } catch (Throwable $e) {
        error_log('[healthcheck] ' . $e->getMessage());
        vip_json(['ok' => false, 'message' => 'ระบบตรวจสุขภาพยังไม่พร้อม กรุณาโทร 053-870-444'], 503);
    }
    return $conn;
}

function healthcheck_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw || strlen($raw) > 20000) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function healthcheck_text(mixed $value, int $max): string
{
    $text = trim(preg_replace('/\s+/u', ' ', (string) ($value ?? '')) ?? '');
    return mb_substr($text, 0, $max);
}

function healthcheck_valid_date(string $date): bool
{
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

function healthcheck_normalize_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone) ?? '';
}

function healthcheck_valid_phone(string $digits): bool
{
    return (bool) preg_match('/^0\d{8,9}$/', $digits);
}

function healthcheck_package_row(array $row): array
{
    $items = json_decode((string) $row['items_json'], true);
    return [
        'id' => intval($row['id']),
        'name' => $row['name'],
        'description' => $row['description'],
        'items' => is_array($items) ? array_values(array_filter($items, 'is_string')) : [],
        'price' => $row['price'],
        'priceNote' => $row['price_note'],
        'tag' => $row['tag'] !== null && $row['tag'] !== '' ? $row['tag'] : null,
        'sortOrder' => intval($row['sort_order']),
        'isActive' => intval($row['is_active']) === 1,
    ];
}
