<?php
/**
 * เชื่อม MySQL ฐาน cpkhospita_project
 *
 * ลำดับการอ่านค่า:
 *   1) ตัวแปรแวดล้อม Docker (DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT)
 *   2) api/config.local.php (ไฟล์นี้ไม่ขึ้น git และเปิดจากเบราว์เซอร์ไม่ได้)
 *
 * ตารางของงานนี้ขึ้นต้น vipward_ ทั้งหมด จะไม่ไปยุ่งตารางอื่นในฐานเดียวกัน
 */
declare(strict_types=1);

function vipward_db_config(): array
{
    static $cached = null;
    if (is_array($cached)) {
        return $cached;
    }

    $config = [
        'host' => 'localhost',
        'user' => 'cpkhospita_project',
        'pass' => '',
        'name' => 'cpkhospita_project',
        'port' => 3306,
        'charset' => 'utf8mb4',
    ];

    $localFile = __DIR__ . '/config.local.php';
    if (is_file($localFile)) {
        $local = require $localFile;
        if (is_array($local)) {
            $config = array_merge($config, $local);
        }
    }

    $envMap = [
        'host' => 'DB_HOST',
        'user' => 'DB_USER',
        'pass' => 'DB_PASS',
        'name' => 'DB_NAME',
        'charset' => 'DB_CHARSET',
    ];
    foreach ($envMap as $key => $env) {
        $value = getenv($env);
        if ($value !== false && $value !== '') {
            $config[$key] = $value;
        }
    }

    $port = getenv('DB_PORT');
    if ($port !== false && $port !== '') {
        $config['port'] = intval($port);
    }

    $cached = $config;
    return $cached;
}

function vipward_db_name(): string
{
    return (string) vipward_db_config()['name'];
}

function vipward_connect(): mysqli
{
    $cfg = vipward_db_config();
    $host = (string) $cfg['host'];
    $user = (string) $cfg['user'];
    $pass = (string) $cfg['pass'];
    $name = (string) $cfg['name'];
    $port = intval($cfg['port']);
    $charset = (string) $cfg['charset'];

    if ($host === '' || $user === '' || $pass === '') {
        throw new RuntimeException('Database config is incomplete');
    }

    $conn = mysqli_init();
    if (!$conn) {
        throw new RuntimeException('mysqli_init failed');
    }

    mysqli_options($conn, MYSQLI_OPT_CONNECT_TIMEOUT, 8);
    mysqli_options($conn, MYSQLI_OPT_INT_AND_FLOAT_NATIVE, 1);

    if (!@mysqli_real_connect($conn, $host, $user, $pass, $name, $port)) {
        throw new RuntimeException('Database connect failed');
    }

    if (!$conn->set_charset($charset)) {
        throw new RuntimeException('Database charset failed');
    }

    $conn->query("SET time_zone = '+07:00'");
    $conn->query("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION'");

    return $conn;
}
