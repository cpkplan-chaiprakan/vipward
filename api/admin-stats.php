<?php
require __DIR__ . '/admin-bootstrap.php';
require_once __DIR__ . '/ward-events.php';

if (!$dbReady || !$conn instanceof mysqli) {
    vip_json(['ok' => false, 'message' => 'ยังไม่สามารถเชื่อมฐานข้อมูลได้'], 503);
}

vipward_require_admin();
vipward_ensure_events_table($conn);
vipward_promote_stale_cleaning($conn);

function vipward_valid_month(string $month): bool
{
    return (bool) preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month);
}

$date = (string) ($_GET['date'] ?? date('Y-m-d'));
$parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
if ($parsed === false || $parsed->format('Y-m-d') !== $date) {
    vip_json(['ok' => false, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง'], 422);
}

$month = (string) ($_GET['month'] ?? $parsed->format('Y-m'));
if (!vipward_valid_month($month)) {
    vip_json(['ok' => false, 'message' => 'รูปแบบเดือนไม่ถูกต้อง'], 422);
}

$monthStart = new DateTimeImmutable($month . '-01');
$monthEnd = $monthStart->modify('last day of this month');
$start = $monthStart->format('Y-m-d');
$end = $monthEnd->format('Y-m-d');
$daysInMonth = (int) $monthEnd->format('j');

$totalRooms = 12;
$roomCount = $conn->query('SELECT COUNT(*) AS total FROM vipward_rooms WHERE is_active = 1');
if ($roomCount) {
    $totalRooms = max(1, intval($roomCount->fetch_assoc()['total'] ?? 12));
}

$todayCounts = [
    'total' => $totalRooms,
    'available' => $totalRooms,
    'reserved' => 0,
    'occupied' => 0,
    'cleaning' => 0,
    'maintenance' => 0,
];
$statusStmt = $conn->prepare(
    "SELECT room_status, COUNT(*) AS total
     FROM vipward_room_status
     WHERE status_date = ? AND room_status <> 'available'
     GROUP BY room_status"
);
$statusStmt->bind_param('s', $date);
$statusStmt->execute();
$statusResult = $statusStmt->get_result();
while ($row = $statusResult->fetch_assoc()) {
    $key = (string) $row['room_status'];
    $count = intval($row['total']);
    if (isset($todayCounts[$key])) {
        $todayCounts[$key] = $count;
        $todayCounts['available'] -= $count;
    }
}

$eventCount = static function (mysqli $conn, string $type, string $from, string $to) : int {
    $stmt = $conn->prepare(
        'SELECT COUNT(*) AS total FROM vipward_events WHERE event_type = ? AND event_date BETWEEN ? AND ?'
    );
    $stmt->bind_param('sss', $type, $from, $to);
    $stmt->execute();
    return intval($stmt->get_result()->fetch_assoc()['total'] ?? 0);
};

$todayEvents = [
    'occupied' => $eventCount($conn, 'occupied', $date, $date),
    'discharged' => $eventCount($conn, 'discharged', $date, $date),
    'transferred' => $eventCount($conn, 'transferred', $date, $date),
    'reserved' => $eventCount($conn, 'reserved', $date, $date),
];

$monthEvents = [
    'occupied' => $eventCount($conn, 'occupied', $start, $end),
    'discharged' => $eventCount($conn, 'discharged', $start, $end),
    'transferred' => $eventCount($conn, 'transferred', $start, $end),
    'reserved' => $eventCount($conn, 'reserved', $start, $end),
];

$nightsStmt = $conn->prepare(
    "SELECT COALESCE(SUM(nights), 0) AS nights, COALESCE(AVG(NULLIF(nights, 0)), 0) AS avg_nights
     FROM vipward_events
     WHERE event_type = 'discharged' AND event_date BETWEEN ? AND ?"
);
$nightsStmt->bind_param('ss', $start, $end);
$nightsStmt->execute();
$nightsRow = $nightsStmt->get_result()->fetch_assoc();
$stayNights = intval($nightsRow['nights'] ?? 0);
$avgStay = round(floatval($nightsRow['avg_nights'] ?? 0), 1);

$occStmt = $conn->prepare(
    "SELECT COUNT(*) AS total FROM vipward_room_status
     WHERE status_date BETWEEN ? AND ? AND room_status = 'occupied'"
);
$occStmt->bind_param('ss', $start, $end);
$occStmt->execute();
$occupiedBedDays = intval($occStmt->get_result()->fetch_assoc()['total'] ?? 0);
$occupancyRate = round(($occupiedBedDays / ($totalRooms * $daysInMonth)) * 100, 1);
$todayOccupancy = round(($todayCounts['occupied'] / $totalRooms) * 100, 1);

$reasonStmt = $conn->prepare(
    "SELECT COALESCE(reason, 'other') AS reason, COUNT(*) AS total
     FROM vipward_events
     WHERE event_type = 'discharged' AND event_date BETWEEN ? AND ?
     GROUP BY reason"
);
$reasonStmt->bind_param('ss', $start, $end);
$reasonStmt->execute();
$reasons = ['home' => 0, 'transfer_ward' => 0, 'refer' => 0, 'other' => 0];
$reasonResult = $reasonStmt->get_result();
while ($row = $reasonResult->fetch_assoc()) {
    $key = (string) $row['reason'];
    if (!isset($reasons[$key])) {
        $key = 'other';
    }
    $reasons[$key] += intval($row['total']);
}

$trend = [];
$cursor = $monthStart;
$trendOcc = $conn->prepare(
    "SELECT event_type, COUNT(*) AS total
     FROM vipward_events
     WHERE event_date = ? AND event_type IN ('occupied','discharged','transferred')
     GROUP BY event_type"
);
while ($cursor <= $monthEnd) {
    $day = $cursor->format('Y-m-d');
    $trendOcc->bind_param('s', $day);
    $trendOcc->execute();
    $bucket = ['date' => $day, 'occupied' => 0, 'discharged' => 0, 'transferred' => 0];
    $dayResult = $trendOcc->get_result();
    while ($row = $dayResult->fetch_assoc()) {
        $bucket[(string) $row['event_type']] = intval($row['total']);
    }
    $trend[] = $bucket;
    $cursor = $cursor->modify('+1 day');
}

$recentStmt = $conn->prepare(
    "SELECT e.id, e.event_type, e.event_date, e.nights, e.reason, e.internal_note, e.created_by, e.created_at,
            r.name AS room_name, d.name AS related_room_name
     FROM vipward_events e
     JOIN vipward_rooms r ON r.id = e.room_id
     LEFT JOIN vipward_rooms d ON d.id = e.related_room_id
     WHERE e.event_date BETWEEN ? AND ?
     ORDER BY e.created_at DESC, e.id DESC
     LIMIT 12"
);
$recentStmt->bind_param('ss', $start, $end);
$recentStmt->execute();
$recent = [];
$recentResult = $recentStmt->get_result();
while ($row = $recentResult->fetch_assoc()) {
    $recent[] = [
        'id' => intval($row['id']),
        'type' => $row['event_type'],
        'date' => $row['event_date'],
        'nights' => intval($row['nights']),
        'reason' => $row['reason'],
        'note' => $row['internal_note'],
        'by' => $row['created_by'],
        'at' => $row['created_at'],
        'roomName' => $row['room_name'],
        'relatedRoomName' => $row['related_room_name'],
    ];
}

vip_json([
    'ok' => true,
    'date' => $date,
    'month' => $month,
    'totalRooms' => $totalRooms,
    'today' => [
        'counts' => $todayCounts,
        'events' => $todayEvents,
        'occupancyRate' => $todayOccupancy,
    ],
    'monthStats' => [
        'events' => $monthEvents,
        'stayNights' => $stayNights,
        'avgStay' => $avgStay,
        'occupiedBedDays' => $occupiedBedDays,
        'occupancyRate' => $occupancyRate,
        'reasons' => $reasons,
    ],
    'trend' => $trend,
    'recent' => $recent,
]);
