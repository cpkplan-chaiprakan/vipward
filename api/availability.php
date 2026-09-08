<?php
/**
 * สถานะห้องรายวันสำหรับหน้าเว็บสาธารณะ
 * ไม่ส่งหมายเหตุภายในหรือข้อมูลผู้ป่วยออกไป
 */
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/ward-events.php';

if (!$dbReady || !$conn instanceof mysqli) {
    vip_json(['ok' => false, 'message' => 'ยังไม่สามารถอ่านสถานะห้องได้'], 503);
}

if (!vipward_table_exists($conn, 'vipward_room_status')) {
    vip_json(['ok' => false, 'message' => 'ยังไม่ได้สร้างตารางสถานะห้อง'], 503);
}

vipward_promote_stale_cleaning($conn);

$month = (string) ($_GET['month'] ?? '');
if ($month !== '') {
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
        vip_json(['ok' => false, 'message' => 'รูปแบบเดือนไม่ถูกต้อง'], 422);
    }

    $firstDay = new DateTimeImmutable($month . '-01');
    $lastDay = $firstDay->modify('last day of this month');
    $roomResult = $conn->query(
        "SELECT id, name FROM vipward_rooms
         WHERE is_active = 1
         ORDER BY FIELD(lane, 'main', 'alt'), sort_order, id"
    );
    $roomNames = [];
    while ($roomResult && $room = $roomResult->fetch_assoc()) {
        $roomNames[(string) $room['id']] = $room['name'];
    }

    $stmt = $conn->prepare(
        "SELECT room_id, status_date, room_status
         FROM vipward_room_status
         WHERE status_date BETWEEN ? AND ?
           AND room_status <> 'available'"
    );
    $start = $firstDay->format('Y-m-d');
    $end = $lastDay->format('Y-m-d');
    $stmt->bind_param('ss', $start, $end);
    $stmt->execute();
    $statusResult = $stmt->get_result();
    $statusByDate = [];
    while ($row = $statusResult->fetch_assoc()) {
        $dateKey = (string) $row['status_date'];
        $statusByDate[$dateKey][] = [
            'roomId' => (string) $row['room_id'],
            'roomName' => $roomNames[(string) $row['room_id']] ?? '',
            'status' => (string) $row['room_status'],
        ];
    }

    $days = [];
    $cursor = $firstDay;
    $totalRooms = count($roomNames);
    while ($cursor <= $lastDay) {
        $dateKey = $cursor->format('Y-m-d');
        $counts = [
            'total' => $totalRooms,
            'available' => $totalRooms,
            'reserved' => 0,
            'occupied' => 0,
            'cleaning' => 0,
            'maintenance' => 0,
        ];
        $details = $statusByDate[$dateKey] ?? [];
        foreach ($details as $detail) {
            $status = $detail['status'];
            if (array_key_exists($status, $counts)) {
                $counts[$status]++;
                $counts['available']--;
            }
        }
        $days[] = [
            'date' => $dateKey,
            'counts' => $counts,
            'details' => $details,
        ];
        $cursor = $cursor->modify('+1 day');
    }

    vip_json([
        'ok' => true,
        'month' => $month,
        'days' => $days,
        'totalRooms' => $totalRooms,
    ]);
}

$date = $_GET['date'] ?? date('Y-m-d');
$parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
if (!$parsed || $parsed->format('Y-m-d') !== $date) {
    vip_json(['ok' => false, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง'], 422);
}

$sql = "SELECT r.id, r.name, r.category, r.swatch,
               COALESCE(s.room_status, 'available') AS room_status,
               s.updated_at
        FROM vipward_rooms r
        LEFT JOIN vipward_room_status s
          ON s.room_id = r.id AND s.status_date = ?
        WHERE r.is_active = 1
        ORDER BY FIELD(r.lane, 'main', 'alt'), r.sort_order, r.id";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    vip_json(['ok' => false, 'message' => 'อ่านสถานะห้องไม่สำเร็จ'], 500);
}
$stmt->bind_param('s', $date);
$stmt->execute();
$result = $stmt->get_result();

$rooms = [];
$counts = [
    'total' => 0,
    'available' => 0,
    'reserved' => 0,
    'occupied' => 0,
    'cleaning' => 0,
    'maintenance' => 0,
];

while ($row = $result->fetch_assoc()) {
    $status = (string) $row['room_status'];
    $rooms[] = [
        'id' => (string) $row['id'],
        'name' => $row['name'],
        'category' => $row['category'],
        'swatch' => $row['swatch'],
        'status' => $status,
        'updatedAt' => $row['updated_at'],
    ];
    $counts['total']++;
    if (array_key_exists($status, $counts)) {
        $counts[$status]++;
    }
}

$stmt->close();
vip_json([
    'ok' => true,
    'date' => $date,
    'rooms' => $rooms,
    'counts' => $counts,
]);
