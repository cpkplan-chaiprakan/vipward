<?php
require __DIR__ . '/admin-bootstrap.php';

if (!$dbReady || !$conn instanceof mysqli) {
    vip_json(['ok' => false, 'message' => 'ยังไม่สามารถเชื่อมฐานข้อมูลได้'], 503);
}

if (!vipward_table_exists($conn, 'vipward_admin_users')) {
    vip_json(['ok' => false, 'message' => 'กรุณารันระบบปรับปรุงฐานข้อมูลก่อน'], 503);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    vip_json([
        'ok' => true,
        'authenticated' => vipward_admin_user() !== null,
        'setupRequired' => vipward_admin_count($conn) === 0,
        'user' => vipward_admin_user(),
    ]);
}

if ($method !== 'POST') {
    vip_json(['ok' => false, 'message' => 'Method not allowed'], 405);
}

$body = vipward_json_body();
$action = (string) ($body['action'] ?? 'login');

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    vip_json(['ok' => true, 'authenticated' => false]);
}

if ($action === 'password') {
    $user = vipward_require_admin();
    $currentPassword = (string) ($body['currentPassword'] ?? '');
    $newPassword = (string) ($body['newPassword'] ?? '');
    $confirmPassword = (string) ($body['confirmPassword'] ?? '');

    if (strlen($newPassword) < 8) {
        vip_json(['ok' => false, 'message' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'], 422);
    }
    if ($newPassword !== $confirmPassword) {
        vip_json(['ok' => false, 'message' => 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'], 422);
    }

    $userId = intval($user['id']);
    $stmt = $conn->prepare(
        'SELECT id, password_hash FROM vipward_admin_users WHERE id = ? AND is_active = 1 LIMIT 1'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
        usleep(350000);
        vip_json(['ok' => false, 'message' => 'รหัสผ่านปัจจุบันไม่ถูกต้อง'], 401);
    }
    if (password_verify($newPassword, $row['password_hash'])) {
        vip_json(['ok' => false, 'message' => 'รหัสผ่านใหม่ต้องต่างจากรหัสเดิม'], 422);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = $conn->prepare('UPDATE vipward_admin_users SET password_hash = ? WHERE id = ?');
    $update->bind_param('si', $hash, $userId);
    if (!$update->execute()) {
        vip_json(['ok' => false, 'message' => 'เปลี่ยนรหัสผ่านไม่สำเร็จ'], 500);
    }

    session_regenerate_id(true);
    vip_json(['ok' => true, 'authenticated' => true, 'user' => vipward_admin_user(), 'message' => 'เปลี่ยนรหัสผ่านแล้ว']);
}

if ($action === 'setup') {
    if (vipward_admin_count($conn) > 0) {
        vip_json(['ok' => false, 'message' => 'ระบบมีบัญชีผู้ดูแลแล้ว'], 409);
    }

    $username = trim((string) ($body['username'] ?? ''));
    $displayName = trim((string) ($body['displayName'] ?? ''));
    $password = (string) ($body['password'] ?? '');

    if (!preg_match('/^[A-Za-z0-9._-]{3,40}$/', $username)) {
        vip_json(['ok' => false, 'message' => 'ชื่อผู้ใช้ต้องมี 3–40 ตัว และใช้ตัวอังกฤษ ตัวเลข จุด ขีดเท่านั้น'], 422);
    }
    if (strlen($displayName) < 2 || strlen($displayName) > 300) {
        vip_json(['ok' => false, 'message' => 'กรุณาระบุชื่อที่แสดง 2–100 ตัวอักษร'], 422);
    }
    if (strlen($password) < 8) {
        vip_json(['ok' => false, 'message' => 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'], 422);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare(
        'INSERT INTO vipward_admin_users (username, password_hash, display_name) VALUES (?, ?, ?)'
    );
    $stmt->bind_param('sss', $username, $hash, $displayName);
    if (!$stmt->execute()) {
        vip_json(['ok' => false, 'message' => 'สร้างบัญชีไม่สำเร็จ'], 500);
    }

    $_SESSION['vipward_admin_id'] = $stmt->insert_id;
    $_SESSION['vipward_admin_username'] = $username;
    $_SESSION['vipward_admin_display_name'] = $displayName;
    session_regenerate_id(true);
    vip_json(['ok' => true, 'authenticated' => true, 'user' => vipward_admin_user()]);
}

$username = trim((string) ($body['username'] ?? ''));
$password = (string) ($body['password'] ?? '');
$stmt = $conn->prepare(
    'SELECT id, username, password_hash, display_name
     FROM vipward_admin_users
     WHERE username = ? AND is_active = 1
     LIMIT 1'
);
$stmt->bind_param('s', $username);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row || !password_verify($password, $row['password_hash'])) {
    usleep(350000);
    vip_json(['ok' => false, 'message' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'], 401);
}

session_regenerate_id(true);
$_SESSION['vipward_admin_id'] = intval($row['id']);
$_SESSION['vipward_admin_username'] = $row['username'];
$_SESSION['vipward_admin_display_name'] = $row['display_name'];

vip_json(['ok' => true, 'authenticated' => true, 'user' => vipward_admin_user()]);
