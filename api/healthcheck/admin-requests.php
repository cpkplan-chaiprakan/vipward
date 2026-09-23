<?php
/**
 * GET  /api/healthcheck/admin-requests.php?status=pending  รายการคำขอตรวจสุขภาพ
 * POST /api/healthcheck/admin-requests.php  { id, action, date?, period?, note? }
 *      action: confirm | reject | complete | cancel | reopen | note
 */
require dirname(__DIR__) . '/admin-bootstrap.php';
require_once __DIR__ . '/common.php';

$conn = healthcheck_require_db($dbReady, $conn);
$user = vipward_require_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function healthcheck_admin_row(array $row): array
{
    return [
        'id' => intval($row['id']),
        'refCode' => $row['ref_code'],
        'packageId' => $row['package_id'] !== null ? intval($row['package_id']) : null,
        'packageName' => $row['package_name'],
        'fullName' => $row['full_name'],
        'phone' => $row['phone'],
        'birthDate' => $row['birth_date'],
        'note' => $row['note'],
        'preferredDate' => $row['preferred_date'],
        'preferredPeriod' => $row['preferred_period'],
        'confirmedDate' => $row['confirmed_date'],
        'confirmedPeriod' => $row['confirmed_period'],
        'status' => $row['status'],
        'staffNote' => $row['staff_note'],
        'handledBy' => $row['handled_by'],
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function healthcheck_counts(mysqli $conn): array
{
    $counts = array_fill_keys(HEALTHCHECK_STATUSES, 0);
    $result = $conn->query('SELECT status, COUNT(*) AS total FROM healthcheck_requests GROUP BY status');
    while ($result && ($row = $result->fetch_assoc())) {
        $counts[$row['status']] = intval($row['total']);
    }

    $today = date('Y-m-d');
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total FROM healthcheck_requests
         WHERE confirmed_date = ? AND status IN ('confirmed','rescheduled')"
    );
    $stmt->bind_param('s', $today);
    $stmt->execute();
    $counts['today'] = intval($stmt->get_result()->fetch_assoc()['total'] ?? 0);

    return $counts;
}

if ($method === 'GET') {
    $status = (string) ($_GET['status'] ?? 'all');
    $sql = 'SELECT * FROM healthcheck_requests';
    $order = " ORDER BY FIELD(status,'pending','confirmed','rescheduled','completed','rejected','cancelled'),
               COALESCE(confirmed_date, preferred_date), created_at DESC
               LIMIT 300";

    if ($status === 'active') {
        $result = $conn->query($sql . " WHERE status IN ('pending','confirmed','rescheduled')" . $order);
    } elseif (in_array($status, HEALTHCHECK_STATUSES, true)) {
        $stmt = $conn->prepare($sql . ' WHERE status = ?' . $order);
        $stmt->bind_param('s', $status);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query($sql . $order);
    }

    $requests = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $requests[] = healthcheck_admin_row($row);
    }

    vip_json(['ok' => true, 'requests' => $requests, 'counts' => healthcheck_counts($conn)]);
}

if ($method !== 'POST') {
    vip_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

$body = vipward_json_body();
$id = intval($body['id'] ?? 0);
$action = (string) ($body['action'] ?? '');
$note = healthcheck_text($body['note'] ?? '', 500);
$noteValue = $note !== '' ? $note : null;
$handledBy = mb_substr($user['displayName'] !== '' ? $user['displayName'] : $user['username'], 0, 100);

$find = $conn->prepare('SELECT * FROM healthcheck_requests WHERE id = ?');
$find->bind_param('i', $id);
$find->execute();
$current = $find->get_result()->fetch_assoc();
if (!$current) {
    vip_json(['ok' => false, 'message' => 'ไม่พบคำขอนี้'], 404);
}

switch ($action) {
    case 'confirm':
        $date = healthcheck_text($body['date'] ?? '', 10);
        $period = (string) ($body['period'] ?? $current['preferred_period']);
        if (!healthcheck_valid_date($date)) {
            vip_json(['ok' => false, 'message' => 'กรุณาเลือกวันนัดตรวจ'], 422);
        }
        if (!in_array($period, HEALTHCHECK_PERIODS, true)) {
            vip_json(['ok' => false, 'message' => 'กรุณาเลือกช่วงเวลา'], 422);
        }
        $status = ($date === $current['preferred_date'] && $period === $current['preferred_period'])
            ? 'confirmed'
            : 'rescheduled';
        $stmt = $conn->prepare(
            'UPDATE healthcheck_requests
             SET status = ?, confirmed_date = ?, confirmed_period = ?, staff_note = ?, handled_by = ?
             WHERE id = ?'
        );
        $stmt->bind_param('sssssi', $status, $date, $period, $noteValue, $handledBy, $id);
        break;

    case 'reject':
    case 'cancel':
        $status = $action === 'reject' ? 'rejected' : 'cancelled';
        if ($action === 'reject' && $noteValue === null) {
            vip_json(['ok' => false, 'message' => 'กรุณาระบุเหตุผลให้คนไข้ทราบ'], 422);
        }
        $stmt = $conn->prepare(
            'UPDATE healthcheck_requests SET status = ?, staff_note = COALESCE(?, staff_note), handled_by = ? WHERE id = ?'
        );
        $stmt->bind_param('sssi', $status, $noteValue, $handledBy, $id);
        break;

    case 'complete':
        if (!in_array($current['status'], ['confirmed', 'rescheduled'], true)) {
            vip_json(['ok' => false, 'message' => 'ต้องยืนยันวันนัดก่อนจึงจะบันทึกว่าตรวจแล้ว'], 422);
        }
        $status = 'completed';
        $stmt = $conn->prepare(
            'UPDATE healthcheck_requests SET status = ?, staff_note = COALESCE(?, staff_note), handled_by = ? WHERE id = ?'
        );
        $stmt->bind_param('sssi', $status, $noteValue, $handledBy, $id);
        break;

    case 'reopen':
        $status = 'pending';
        $stmt = $conn->prepare(
            'UPDATE healthcheck_requests
             SET status = ?, confirmed_date = NULL, confirmed_period = NULL, handled_by = ?
             WHERE id = ?'
        );
        $stmt->bind_param('ssi', $status, $handledBy, $id);
        break;

    case 'note':
        $stmt = $conn->prepare('UPDATE healthcheck_requests SET staff_note = ?, handled_by = ? WHERE id = ?');
        $stmt->bind_param('ssi', $noteValue, $handledBy, $id);
        break;

    default:
        vip_json(['ok' => false, 'message' => 'คำสั่งไม่ถูกต้อง'], 422);
}

if (!$stmt->execute()) {
    vip_json(['ok' => false, 'message' => 'บันทึกไม่สำเร็จ'], 500);
}

$find->execute();
$updated = $find->get_result()->fetch_assoc();

vip_json([
    'ok' => true,
    'request' => healthcheck_admin_row($updated),
    'counts' => healthcheck_counts($conn),
]);
