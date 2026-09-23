<?php
/**
 * GET /api/healthcheck/packages.php
 * แพ็กเกจตรวจสุขภาพที่เปิดให้คนไข้เลือก
 */
require dirname(__DIR__) . '/bootstrap.php';
require_once __DIR__ . '/common.php';

$conn = healthcheck_require_db($dbReady, $conn);

$result = $conn->query(
    'SELECT id, name, description, items_json, price, price_note, tag, sort_order, is_active
     FROM healthcheck_packages
     WHERE is_active = 1
     ORDER BY sort_order, id'
);

$packages = [];
while ($result && ($row = $result->fetch_assoc())) {
    $packages[] = healthcheck_package_row($row);
}

vip_json(['ok' => true, 'packages' => $packages]);
