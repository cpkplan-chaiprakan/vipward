<?php
/**
 * GET  /api/healthcheck/admin-packages.php  แพ็กเกจทั้งหมด (รวมที่ซ่อน)
 * POST /api/healthcheck/admin-packages.php  { action: save|toggle|delete, ... }
 */
require dirname(__DIR__) . '/admin-bootstrap.php';
require_once __DIR__ . '/common.php';

$conn = healthcheck_require_db($dbReady, $conn);
vipward_require_admin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function healthcheck_all_packages(mysqli $conn): array
{
    $result = $conn->query(
        'SELECT p.*, (SELECT COUNT(*) FROM healthcheck_requests r WHERE r.package_id = p.id) AS request_count
         FROM healthcheck_packages p
         ORDER BY p.sort_order, p.id'
    );
    $packages = [];
    while ($result && ($row = $result->fetch_assoc())) {
        $package = healthcheck_package_row($row);
        $package['requestCount'] = intval($row['request_count']);
        $packages[] = $package;
    }
    return $packages;
}

if ($method === 'GET') {
    vip_json(['ok' => true, 'packages' => healthcheck_all_packages($conn)]);
}

if ($method !== 'POST') {
    vip_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

$body = vipward_json_body();
$action = (string) ($body['action'] ?? '');
$id = intval($body['id'] ?? 0);

if ($action === 'save') {
    $name = healthcheck_text($body['name'] ?? '', 191);
    $description = healthcheck_text($body['description'] ?? '', 1000);
    $price = healthcheck_text($body['price'] ?? '', 100);
    $priceNote = healthcheck_text($body['priceNote'] ?? '', 50);
    $tag = healthcheck_text($body['tag'] ?? '', 50);
    $tagValue = $tag !== '' ? $tag : null;
    $sortOrder = max(0, min(999, intval($body['sortOrder'] ?? 0)));
    $isActive = !empty($body['isActive']) ? 1 : 0;

    $items = [];
    foreach ((array) ($body['items'] ?? []) as $item) {
        $text = healthcheck_text($item, 200);
        if ($text !== '') {
            $items[] = $text;
        }
    }
    $items = array_slice($items, 0, 30);
    $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE);

    if ($name === '') {
        vip_json(['ok' => false, 'message' => 'กรุณาตั้งชื่อแพ็กเกจ'], 422);
    }
    if ($price === '') {
        $price = 'สอบถามราคา';
    }

    if ($id > 0) {
        $stmt = $conn->prepare(
            'UPDATE healthcheck_packages
             SET name = ?, description = ?, items_json = ?, price = ?, price_note = ?, tag = ?, sort_order = ?, is_active = ?
             WHERE id = ?'
        );
        $stmt->bind_param('ssssssiii', $name, $description, $itemsJson, $price, $priceNote, $tagValue, $sortOrder, $isActive, $id);
    } else {
        $stmt = $conn->prepare(
            'INSERT INTO healthcheck_packages (name, description, items_json, price, price_note, tag, sort_order, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->bind_param('ssssssii', $name, $description, $itemsJson, $price, $priceNote, $tagValue, $sortOrder, $isActive);
    }
    if (!$stmt->execute()) {
        vip_json(['ok' => false, 'message' => 'บันทึกแพ็กเกจไม่สำเร็จ'], 500);
    }
} elseif ($action === 'toggle') {
    $stmt = $conn->prepare('UPDATE healthcheck_packages SET is_active = 1 - is_active WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
} elseif ($action === 'delete') {
    $stmt = $conn->prepare('DELETE FROM healthcheck_packages WHERE id = ?');
    $stmt->bind_param('i', $id);
    $stmt->execute();
} else {
    vip_json(['ok' => false, 'message' => 'คำสั่งไม่ถูกต้อง'], 422);
}

vip_json(['ok' => true, 'packages' => healthcheck_all_packages($conn)]);
