<?php
/**
 * POST /api/healthcheck/request.php  คนไข้ส่งคำขอตรวจสุขภาพ
 * GET  /api/healthcheck/request.php?ref=HC-...&phone=08...  เช็กสถานะคำขอ
 */
require dirname(__DIR__) . '/bootstrap.php';
require_once __DIR__ . '/common.php';

$conn = healthcheck_require_db($dbReady, $conn);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $ref = strtoupper(healthcheck_text($_GET['ref'] ?? '', 20));
    $phone = healthcheck_normalize_phone((string) ($_GET['phone'] ?? ''));

    if (!preg_match('/^HC-\d{4}-\d{4}$/', $ref) || !healthcheck_valid_phone($phone)) {
        vip_json(['ok' => false, 'message' => 'กรุณากรอกรหัสคำขอและเบอร์โทรให้ถูกต้อง'], 422);
    }

    $stmt = $conn->prepare(
        'SELECT ref_code, package_name, full_name, preferred_date, preferred_period,
                confirmed_date, confirmed_period, status, staff_note, created_at, updated_at
         FROM healthcheck_requests
         WHERE ref_code = ? AND phone = ?
         LIMIT 1'
    );
    $stmt->bind_param('ss', $ref, $phone);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        vip_json(['ok' => false, 'message' => 'ไม่พบคำขอนี้ ตรวจสอบรหัสคำขอและเบอร์โทรอีกครั้ง'], 404);
    }

    $firstName = explode(' ', (string) $row['full_name'])[0];

    vip_json([
        'ok' => true,
        'request' => [
            'refCode' => $row['ref_code'],
            'packageName' => $row['package_name'],
            'firstName' => $firstName,
            'preferredDate' => $row['preferred_date'],
            'preferredPeriod' => $row['preferred_period'],
            'confirmedDate' => $row['confirmed_date'],
            'confirmedPeriod' => $row['confirmed_period'],
            'status' => $row['status'],
            'staffNote' => $row['staff_note'],
            'createdAt' => $row['created_at'],
            'updatedAt' => $row['updated_at'],
        ],
    ]);
}

if ($method !== 'POST') {
    vip_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

$body = healthcheck_body();

// ช่องซ่อนสำหรับกันบอท คนจริงจะไม่เห็นและไม่กรอก
if (healthcheck_text($body['website'] ?? '', 200) !== '') {
    vip_json(['ok' => true, 'refCode' => 'HC-0000-0000']);
}

$packageId = intval($body['packageId'] ?? 0);
$fullName = healthcheck_text($body['fullName'] ?? '', 150);
$phone = healthcheck_normalize_phone((string) ($body['phone'] ?? ''));
$birthDate = healthcheck_text($body['birthDate'] ?? '', 10);
$preferredDate = healthcheck_text($body['preferredDate'] ?? '', 10);
$preferredPeriod = (string) ($body['preferredPeriod'] ?? 'morning');
$note = healthcheck_text($body['note'] ?? '', 500);

if (mb_strlen($fullName) < 4) {
    vip_json(['ok' => false, 'message' => 'กรุณากรอกชื่อ-นามสกุล'], 422);
}
if (!healthcheck_valid_phone($phone)) {
    vip_json(['ok' => false, 'message' => 'เบอร์โทรไม่ถูกต้อง ใช้เบอร์ 9–10 หลักขึ้นต้นด้วย 0'], 422);
}
if (!in_array($preferredPeriod, HEALTHCHECK_PERIODS, true)) {
    vip_json(['ok' => false, 'message' => 'กรุณาเลือกช่วงเวลา'], 422);
}
if (!healthcheck_valid_date($preferredDate)) {
    vip_json(['ok' => false, 'message' => 'กรุณาเลือกวันที่ต้องการตรวจ'], 422);
}

$today = new DateTimeImmutable('today');
$wanted = new DateTimeImmutable($preferredDate);
if ($wanted < $today) {
    vip_json(['ok' => false, 'message' => 'เลือกวันที่ย้อนหลังไม่ได้'], 422);
}
if ($wanted > $today->modify('+180 days')) {
    vip_json(['ok' => false, 'message' => 'จองล่วงหน้าได้ไม่เกิน 6 เดือน'], 422);
}

$birth = null;
if ($birthDate !== '') {
    if (!healthcheck_valid_date($birthDate) || new DateTimeImmutable($birthDate) >= $today) {
        vip_json(['ok' => false, 'message' => 'วันเกิดไม่ถูกต้อง'], 422);
    }
    $birth = $birthDate;
}

$pkgStmt = $conn->prepare('SELECT id, name FROM healthcheck_packages WHERE id = ? AND is_active = 1');
$pkgStmt->bind_param('i', $packageId);
$pkgStmt->execute();
$package = $pkgStmt->get_result()->fetch_assoc();
if (!$package) {
    vip_json(['ok' => false, 'message' => 'กรุณาเลือกแพ็กเกจตรวจสุขภาพ'], 422);
}

$clientHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . '|healthcheck');
$limitStmt = $conn->prepare(
    'SELECT COUNT(*) AS total FROM healthcheck_requests
     WHERE (client_hash = ? OR phone = ?) AND created_at > (NOW() - INTERVAL 10 MINUTE)'
);
$limitStmt->bind_param('ss', $clientHash, $phone);
$limitStmt->execute();
if (intval($limitStmt->get_result()->fetch_assoc()['total'] ?? 0) >= 3) {
    vip_json(['ok' => false, 'message' => 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่ หรือโทร 053-870-444'], 429);
}

$insert = $conn->prepare(
    'INSERT INTO healthcheck_requests
        (ref_code, package_id, package_name, full_name, phone, birth_date, note, preferred_date, preferred_period, client_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

$packageName = (string) $package['name'];
$noteValue = $note !== '' ? $note : null;
$refCode = '';
$saved = false;
for ($attempt = 0; $attempt < 5; $attempt++) {
    $refCode = sprintf('HC-%s-%04d', date('ym'), random_int(0, 9999));
    $insert->bind_param(
        'sissssssss',
        $refCode,
        $packageId,
        $packageName,
        $fullName,
        $phone,
        $birth,
        $noteValue,
        $preferredDate,
        $preferredPeriod,
        $clientHash
    );
    try {
        if ($insert->execute()) {
            $saved = true;
            break;
        }
        if ($insert->errno !== 1062) {
            break;
        }
    } catch (mysqli_sql_exception $e) {
        if ($e->getCode() !== 1062) {
            error_log('[healthcheck] insert: ' . $e->getMessage());
            break;
        }
    }
}

if (!$saved) {
    vip_json(['ok' => false, 'message' => 'บันทึกคำขอไม่สำเร็จ กรุณาลองใหม่'], 500);
}

vip_json([
    'ok' => true,
    'message' => 'ส่งคำขอแล้ว เจ้าหน้าที่จะติดต่อกลับเพื่อยืนยันวัน',
    'refCode' => $refCode,
    'preferredDate' => $preferredDate,
    'preferredPeriod' => $preferredPeriod,
    'packageName' => $packageName,
]);
