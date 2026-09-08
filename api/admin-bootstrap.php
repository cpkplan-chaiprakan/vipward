<?php
/**
 * Session และตัวช่วยยืนยันตัวตนสำหรับหน้าพยาบาล
 */
require_once __DIR__ . '/bootstrap.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('vipward_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function vipward_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function vipward_admin_user(): ?array
{
    if (empty($_SESSION['vipward_admin_id'])) {
        return null;
    }
    return [
        'id' => intval($_SESSION['vipward_admin_id']),
        'username' => (string) ($_SESSION['vipward_admin_username'] ?? ''),
        'displayName' => (string) ($_SESSION['vipward_admin_display_name'] ?? ''),
    ];
}

function vipward_require_admin(): array
{
    $user = vipward_admin_user();
    if (!$user) {
        vip_json(['ok' => false, 'message' => 'กรุณาเข้าสู่ระบบ'], 401);
    }
    return $user;
}

function vipward_admin_count(mysqli $conn): int
{
    if (!vipward_table_exists($conn, 'vipward_admin_users')) {
        return 0;
    }
    $result = $conn->query('SELECT COUNT(*) AS total FROM vipward_admin_users');
    $row = $result ? $result->fetch_assoc() : null;
    return intval($row['total'] ?? 0);
}
