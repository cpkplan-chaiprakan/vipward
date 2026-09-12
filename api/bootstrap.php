<?php
/**
 * จุดตั้งค่า JSON API ของ vipward
 */
declare(strict_types=1);

date_default_timezone_set('Asia/Bangkok');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowLocal = preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#i', $origin);
if ($allowLocal) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/connect.php';

function vip_json(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$conn = null;
$dbReady = false;
$dbNote = 'ยังไม่เชื่อมฐานข้อมูล ใช้ข้อมูลตัวอย่างจากเว็บ';

try {
    $conn = vipward_connect();
    $dbReady = true;
    $currentDb = $conn->query('SELECT DATABASE()');
    $dbName = $currentDb ? ($currentDb->fetch_row()[0] ?? '') : '';
    $dbNote = $dbName !== '' ? 'เชื่อม ' . $dbName . ' แล้ว' : 'เชื่อมฐานข้อมูลแล้ว';
} catch (Throwable $e) {
    error_log('[vipward] DB bootstrap: ' . $e->getMessage());
    $conn = null;
    $dbReady = false;
}

function vipward_table_exists(mysqli $conn, string $table): bool
{
    $safe = $conn->real_escape_string($table);
    $result = $conn->query("SHOW TABLES LIKE '{$safe}'");
    return $result && $result->num_rows > 0;
}
