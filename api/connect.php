<?php
/**
 * เชื่อม MySQL ฐาน cpkhospita_cpkdoctor
 *
 * ลำดับการอ่านค่า:
 *   1) ตัวแปรแวดล้อม Docker (DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT)
 *   2) connect.php ของ cpkdashboard ถ้าหาไฟล์เจอ
 */
declare(strict_types=1);

function vipward_dashboard_connect_path(): ?string
{
    $candidates = [
        dirname(__DIR__, 2) . '/boot/cpkdashboard/connect.php',
        dirname(__DIR__, 2) . '/cpkdashboard/connect.php',
        dirname(__DIR__, 3) . '/cpkdashboard/connect.php',
        '/home/cpkhospita/web/cpkhospital.com/public_html/cpkdashboard/connect.php',
    ];

    foreach ($candidates as $path) {
        $real = realpath($path);
        if ($real && is_file($real)) {
            return $real;
        }
    }

    return null;
}

function vipward_connect(): mysqli
{
    $host = getenv('DB_HOST') ?: '';
    $user = getenv('DB_USER') ?: '';
    $pass = getenv('DB_PASS') ?: '';
    $name = getenv('DB_NAME') ?: 'cpkhospita_cpkdoctor';
    $port = intval(getenv('DB_PORT') ?: 3306);
    $charset = getenv('DB_CHARSET') ?: 'utf8mb4';

    if ($host !== '' && $user !== '') {
        $conn = mysqli_init();
        if (!$conn) {
            throw new RuntimeException('mysqli_init failed');
        }
        mysqli_options($conn, MYSQLI_OPT_CONNECT_TIMEOUT, 10);
        if (!mysqli_real_connect($conn, $host, $user, $pass, $name, $port)) {
            throw new RuntimeException('Database connect failed');
        }
        $conn->set_charset($charset);
        $conn->query("SET time_zone = '+07:00'");
        return $conn;
    }

    $dashboard = vipward_dashboard_connect_path();
    if ($dashboard !== null) {
        if (!defined('ALLOW_ACCESS')) {
            define('ALLOW_ACCESS', true);
        }
        require $dashboard;
        if (isset($conn) && $conn instanceof mysqli && !$conn->connect_error) {
            $conn->query("SET time_zone = '+07:00'");
            return $conn;
        }
    }

    throw new RuntimeException('No database connection available');
}
