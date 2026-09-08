<?php
/**
 * บันทึกเหตุการณ์หอพิเศษสำหรับสถิติ (จำหน่าย / ย้ายห้อง / เข้าพัก)
 * วันที่ในฐานข้อมูลเป็น ค.ศ. เสมอ
 */

function vipward_ensure_events_table(mysqli $conn): void
{
    $conn->query(
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
            CONSTRAINT fk_vipward_events_room
              FOREIGN KEY (room_id) REFERENCES vipward_rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function vipward_log_event(
    mysqli $conn,
    string $type,
    string $roomId,
    string $date,
    string $by,
    int $nights = 0,
    ?string $reason = null,
    ?string $relatedRoomId = null,
    ?string $note = null
): void {
    vipward_ensure_events_table($conn);

    if ($type === 'occupied' || $type === 'reserved') {
        $dup = $conn->prepare(
            'SELECT id FROM vipward_events
             WHERE event_type = ? AND room_id = ? AND event_date = ?
             LIMIT 1'
        );
        $dup->bind_param('sss', $type, $roomId, $date);
        $dup->execute();
        if ($dup->get_result()->fetch_assoc()) {
            return;
        }
    }

    $related = $relatedRoomId ?: '';
    $reasonValue = $reason ?: '';
    $noteValue = $note ?: '';
    $stmt = $conn->prepare(
        'INSERT INTO vipward_events
            (event_type, room_id, related_room_id, event_date, nights, reason, internal_note, created_by)
         VALUES (?, ?, NULLIF(?, \'\'), ?, ?, NULLIF(?, \'\'), NULLIF(?, \'\'), ?)'
    );
    $stmt->bind_param(
        'ssssisss',
        $type,
        $roomId,
        $related,
        $date,
        $nights,
        $reasonValue,
        $noteValue,
        $by
    );
    $stmt->execute();
}

function vipward_occupied_nights(mysqli $conn, string $roomId, string $endDate): int
{
    $nights = 0;
    $cursor = new DateTimeImmutable($endDate);
    $stmt = $conn->prepare(
        'SELECT room_status FROM vipward_room_status WHERE room_id = ? AND status_date = ?'
    );
    for ($i = 0; $i < 90; $i++) {
        $date = $cursor->format('Y-m-d');
        $stmt->bind_param('ss', $roomId, $date);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        if (!$row || $row['room_status'] !== 'occupied') {
            break;
        }
        $nights++;
        $cursor = $cursor->modify('-1 day');
    }
    return max($nights, 1);
}

function vipward_future_occupied_dates(mysqli $conn, string $roomId, string $fromDate): array
{
    $stmt = $conn->prepare(
        "SELECT status_date FROM vipward_room_status
         WHERE room_id = ? AND status_date >= ? AND room_status = 'occupied'
         ORDER BY status_date"
    );
    $stmt->bind_param('ss', $roomId, $fromDate);
    $stmt->execute();
    $dates = [];
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $dates[] = (string) $row['status_date'];
    }
    return $dates;
}

function vipward_upsert_status(
    mysqli $conn,
    string $roomId,
    string $date,
    string $status,
    string $note,
    string $by
): void {
    $stmt = $conn->prepare(
        "INSERT INTO vipward_room_status
            (room_id, status_date, room_status, internal_note, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            room_status = VALUES(room_status),
            internal_note = VALUES(internal_note),
            updated_by = VALUES(updated_by)"
    );
    $stmt->bind_param('sssss', $roomId, $date, $status, $note, $by);
    $stmt->execute();
}

function vipward_clear_occupied_from(mysqli $conn, string $roomId, string $fromDate): void
{
    $stmt = $conn->prepare(
        "DELETE FROM vipward_room_status
         WHERE room_id = ? AND status_date > ? AND room_status = 'occupied'"
    );
    $stmt->bind_param('ss', $roomId, $fromDate);
    $stmt->execute();
}

/** ห้องทำความสะอาดเกิน 1 ชม. → ว่างอัตโนมัติ */
function vipward_promote_stale_cleaning(mysqli $conn): int
{
    $ok = $conn->query(
        "UPDATE vipward_room_status
         SET room_status = 'available',
             internal_note = 'พ้นเวลาทำความสะอาด 1 ชม. ห้องว่างอัตโนมัติ',
             updated_by = 'ระบบ'
         WHERE room_status = 'cleaning'
           AND updated_at <= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    return $ok ? $conn->affected_rows : 0;
}

function vipward_cleaning_until(?string $updatedAt): ?string
{
    if (!$updatedAt) {
        return null;
    }
    try {
        return (new DateTimeImmutable($updatedAt))->modify('+1 hour')->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}
