<?php
require __DIR__ . '/admin-bootstrap.php';
require_once __DIR__ . '/ward-events.php';

if (!$dbReady || !$conn instanceof mysqli) {
    vip_json(['ok' => false, 'message' => 'ยังไม่สามารถเชื่อมฐานข้อมูลได้'], 503);
}

$user = vipward_require_admin();

function vipward_valid_date(string $date): bool
{
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $date = (string) ($_GET['date'] ?? date('Y-m-d'));
    if (!vipward_valid_date($date)) {
        vip_json(['ok' => false, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง'], 422);
    }

    vipward_promote_stale_cleaning($conn);

    $stmt = $conn->prepare(
        "SELECT r.id, r.name, r.category, r.swatch,
                COALESCE(s.room_status, 'available') AS room_status,
                COALESCE(s.internal_note, '') AS internal_note,
                s.updated_by, s.updated_at
         FROM vipward_rooms r
         LEFT JOIN vipward_room_status s
           ON s.room_id = r.id AND s.status_date = ?
         WHERE r.is_active = 1
         ORDER BY FIELD(r.lane, 'main', 'alt'), r.sort_order, r.id"
    );
    $stmt->bind_param('s', $date);
    $stmt->execute();
    $rooms = [];
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $rooms[] = [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'swatch' => $row['swatch'],
            'status' => $row['room_status'],
            'note' => $row['internal_note'],
            'updatedBy' => $row['updated_by'],
            'updatedAt' => $row['updated_at'],
            'autoAvailableAt' => $row['room_status'] === 'cleaning'
                ? vipward_cleaning_until($row['updated_at'] ?? null)
                : null,
        ];
    }
    vip_json(['ok' => true, 'date' => $date, 'rooms' => $rooms, 'user' => $user]);
}

if ($method !== 'POST') {
    vip_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

$body = vipward_json_body();
$action = (string) ($body['action'] ?? 'update'); // update | clear | discharge | transfer
$roomId = trim((string) ($body['roomId'] ?? ''));
$startDate = (string) ($body['startDate'] ?? $body['date'] ?? '');
$endDate = (string) ($body['endDate'] ?? $startDate);
$status = (string) ($body['status'] ?? '');
$note = trim((string) ($body['note'] ?? ''));
$reason = trim((string) ($body['reason'] ?? ''));
$toRoomId = trim((string) ($body['toRoomId'] ?? ''));
$allowedStatuses = ['available', 'reserved', 'occupied', 'cleaning', 'maintenance'];
$dischargeReasons = ['home', 'transfer_ward', 'refer', 'other'];

// วันที่จาก frontend เป็น ISO ค.ศ. (YYYY-MM-DD) เสมอ — หน้าเว็บแปลงเป็น พ.ศ. ตอนแสดงผลเท่านั้น
if (!vipward_valid_date($startDate) || !vipward_valid_date($endDate)) {
    vip_json(['ok' => false, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง'], 422);
}
if ($action !== 'clear' && $action !== 'discharge' && $action !== 'transfer' && !in_array($status, $allowedStatuses, true)) {
    vip_json(['ok' => false, 'message' => 'สถานะห้องไม่ถูกต้อง'], 422);
}
if (strlen($note) > 750) {
    vip_json(['ok' => false, 'message' => 'หมายเหตุยาวเกินไป'], 422);
}

$start = new DateTimeImmutable($startDate);
$end = new DateTimeImmutable($endDate);
if ($end < $start) {
    vip_json(['ok' => false, 'message' => 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น'], 422);
}
if ($start->diff($end)->days > 90) {
    vip_json(['ok' => false, 'message' => 'อัปเดตได้ครั้งละไม่เกิน 90 วัน'], 422);
}

$roomStmt = $conn->prepare('SELECT id, name FROM vipward_rooms WHERE id = ? AND is_active = 1');
$roomStmt->bind_param('s', $roomId);
$roomStmt->execute();
$roomRow = $roomStmt->get_result()->fetch_assoc();
if (!$roomRow) {
    vip_json(['ok' => false, 'message' => 'ไม่พบห้องที่เลือก'], 404);
}
$roomName = (string) $roomRow['name'];

$updatedBy = $user['displayName'] ?: $user['username'];

if ($action === 'clear') {
    // ลบสถานะในช่วงวันที่ → ห้องกลับเป็น "ว่าง" (ไม่มีแถวในตาราง)
    $delete = $conn->prepare(
        'DELETE FROM vipward_room_status WHERE room_id = ? AND status_date BETWEEN ? AND ?'
    );
    $delete->bind_param('sss', $roomId, $startDate, $endDate);
    if (!$delete->execute()) {
        error_log('[vipward] status clear: ' . $delete->error);
        vip_json(['ok' => false, 'message' => 'ลบสถานะไม่สำเร็จ'], 500);
    }
    $removed = $delete->affected_rows;
    vip_json([
        'ok' => true,
        'message' => $removed > 0 ? "ลบสถานะ {$removed} วันแล้ว ห้องกลับเป็นว่าง" : 'ไม่มีสถานะที่ต้องลบ ห้องว่างอยู่แล้ว',
        'updated' => $removed,
    ]);
}

if ($action === 'discharge') {
    if (!in_array($reason, $dischargeReasons, true)) {
        vip_json(['ok' => false, 'message' => 'กรุณาเลือกเหตุผลการจำหน่าย'], 422);
    }
    $todayStatus = $conn->prepare(
        'SELECT room_status FROM vipward_room_status WHERE room_id = ? AND status_date = ?'
    );
    $todayStatus->bind_param('ss', $roomId, $startDate);
    $todayStatus->execute();
    $current = $todayStatus->get_result()->fetch_assoc();
    $currentStatus = $current['room_status'] ?? 'available';
    if ($currentStatus !== 'occupied') {
        vip_json(['ok' => false, 'message' => 'จำหน่ายได้เฉพาะห้องที่กำลังเข้าพัก'], 422);
    }

    $nights = vipward_occupied_nights($conn, $roomId, $startDate);
    $cleanNote = $note !== '' ? $note : 'จำหน่ายแล้ว กำลังเตรียมห้อง';

    $conn->begin_transaction();
    try {
        vipward_log_event($conn, 'discharged', $roomId, $startDate, $updatedBy, $nights, $reason, null, $note);
        vipward_upsert_status($conn, $roomId, $startDate, 'cleaning', $cleanNote, $updatedBy);
        vipward_clear_occupied_from($conn, $roomId, $startDate);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        error_log('[vipward] discharge: ' . $e->getMessage());
        vip_json(['ok' => false, 'message' => 'บันทึกการจำหน่ายไม่สำเร็จ'], 500);
    }

    vip_json([
        'ok' => true,
        'message' => "จำหน่าย {$roomName} แล้ว · พัก {$nights} วัน ห้องกำลังทำความสะอาด",
        'updated' => 1,
        'nights' => $nights,
    ]);
}

if ($action === 'transfer') {
    if ($toRoomId === '' || $toRoomId === $roomId) {
        vip_json(['ok' => false, 'message' => 'กรุณาเลือกห้องปลายทาง'], 422);
    }
    $destStmt = $conn->prepare('SELECT id, name FROM vipward_rooms WHERE id = ? AND is_active = 1');
    $destStmt->bind_param('s', $toRoomId);
    $destStmt->execute();
    $destRow = $destStmt->get_result()->fetch_assoc();
    if (!$destRow) {
        vip_json(['ok' => false, 'message' => 'ไม่พบห้องปลายทาง'], 404);
    }
    $destName = (string) $destRow['name'];

    $srcStatus = $conn->prepare(
        'SELECT room_status FROM vipward_room_status WHERE room_id = ? AND status_date = ?'
    );
    $srcStatus->bind_param('ss', $roomId, $startDate);
    $srcStatus->execute();
    $src = $srcStatus->get_result()->fetch_assoc();
    if (($src['room_status'] ?? 'available') !== 'occupied') {
        vip_json(['ok' => false, 'message' => 'ย้ายห้องได้เฉพาะห้องที่กำลังเข้าพัก'], 422);
    }

    $destStatus = $conn->prepare(
        "SELECT COALESCE(s.room_status, 'available') AS room_status
         FROM vipward_rooms r
         LEFT JOIN vipward_room_status s ON s.room_id = r.id AND s.status_date = ?
         WHERE r.id = ?"
    );
    $destStatus->bind_param('ss', $startDate, $toRoomId);
    $destStatus->execute();
    $destCurrent = $destStatus->get_result()->fetch_assoc();
    $destState = $destCurrent['room_status'] ?? 'available';
    if (!in_array($destState, ['available', 'cleaning'], true)) {
        vip_json(['ok' => false, 'message' => "{$destName} ยังไม่ว่าง ไม่สามารถย้ายได้"], 409);
    }

    $stayDates = vipward_future_occupied_dates($conn, $roomId, $startDate);
    if (!$stayDates) {
        $stayDates = [$startDate];
    }
    $transferNote = $note !== '' ? $note : "ย้ายจาก {$roomName}";
    $sourceNote = $note !== '' ? $note : "ย้ายไป {$destName} กำลังเตรียมห้อง";

    $conn->begin_transaction();
    try {
        vipward_log_event(
            $conn,
            'transferred',
            $roomId,
            $startDate,
            $updatedBy,
            count($stayDates),
            'room_transfer',
            $toRoomId,
            $note
        );
        foreach ($stayDates as $stayDate) {
            vipward_upsert_status($conn, $toRoomId, $stayDate, 'occupied', $transferNote, $updatedBy);
        }
        vipward_upsert_status($conn, $roomId, $startDate, 'cleaning', $sourceNote, $updatedBy);
        vipward_clear_occupied_from($conn, $roomId, $startDate);
        vipward_log_event($conn, 'occupied', $toRoomId, $startDate, $updatedBy, 0, null, $roomId, $note);
        $conn->commit();
    } catch (Throwable $e) {
        $conn->rollback();
        error_log('[vipward] transfer: ' . $e->getMessage());
        vip_json(['ok' => false, 'message' => 'ย้ายห้องไม่สำเร็จ'], 500);
    }

    vip_json([
        'ok' => true,
        'message' => "ย้ายจาก {$roomName} ไป {$destName} แล้ว ห้องเดิมกำลังทำความสะอาด",
        'updated' => count($stayDates),
    ]);
}

$upsert = $conn->prepare(
    "INSERT INTO vipward_room_status
        (room_id, status_date, room_status, internal_note, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        room_status = VALUES(room_status),
        internal_note = VALUES(internal_note),
        updated_by = VALUES(updated_by)"
);

$conn->begin_transaction();
try {
    $cursor = $start;
    $updated = 0;
    while ($cursor <= $end) {
        $date = $cursor->format('Y-m-d');
        $upsert->bind_param('sssss', $roomId, $date, $status, $note, $updatedBy);
        $upsert->execute();
        $updated++;
        $cursor = $cursor->modify('+1 day');
    }
    if ($status === 'occupied') {
        vipward_log_event($conn, 'occupied', $roomId, $startDate, $updatedBy, $updated, null, null, $note);
    } elseif ($status === 'reserved') {
        vipward_log_event($conn, 'reserved', $roomId, $startDate, $updatedBy, $updated, null, null, $note);
    }
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    error_log('[vipward] status update: ' . $e->getMessage());
    vip_json(['ok' => false, 'message' => 'บันทึกสถานะไม่สำเร็จ'], 500);
}

vip_json([
    'ok' => true,
    'message' => "บันทึกสถานะ {$updated} วันแล้ว",
    'updated' => $updated,
]);
