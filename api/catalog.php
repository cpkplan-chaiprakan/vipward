<?php
/**
 * GET /api/catalog.php
 * อ่านข้อมูลเว็บห้องพิเศษจากตาราง vipward_* ใน cpkhospita_cpkdoctor
 */
require __DIR__ . '/bootstrap.php';

$payload = [
    'ok' => true,
    'source' => 'fallback',
    'dbReady' => $dbReady,
    'note' => $dbNote,
    'hospital' => null,
    'rooms' => [],
    'roomsAlt' => [],
    'packages' => [],
    'amenities' => [],
    'steps' => [],
    'perks' => [],
    'rights' => [],
];

if (!$dbReady || !$conn instanceof mysqli) {
    vip_json($payload);
}

$required = [
    'vipward_settings',
    'vipward_rooms',
    'vipward_packages',
    'vipward_amenities',
    'vipward_steps',
    'vipward_perks',
    'vipward_rights',
];

foreach ($required as $table) {
    if (!vipward_table_exists($conn, $table)) {
        $payload['note'] = 'เชื่อมฐานแล้ว แต่ยังไม่มีตาราง vipward_* กรุณารัน php api/migrate.php';
        vip_json($payload);
    }
}

$settings = [];
$result = $conn->query('SELECT setting_key, setting_value FROM vipward_settings');
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
}

if ($settings) {
    $payload['hospital'] = [
        'shortName' => $settings['short_name'] ?? 'CPK',
        'name' => $settings['name'] ?? 'โรงพยาบาลไชยปราการ',
        'tagline' => $settings['tagline'] ?? '',
        'address' => $settings['address'] ?? '',
        'phone' => $settings['phone'] ?? '',
        'phoneHref' => $settings['phone_href'] ?? '',
        'facebook' => $settings['facebook'] ?? '',
        'line' => $settings['line'] ?? '',
        'website' => $settings['website'] ?? '',
        'hours' => [
            $settings['hours_1'] ?? '',
            $settings['hours_2'] ?? '',
        ],
    ];
}

$result = $conn->query(
    "SELECT id, name, category, description, swatch, tag, lane
     FROM vipward_rooms
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC"
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $item = [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'category' => $row['category'],
            'description' => $row['description'],
            'swatch' => $row['swatch'],
            'tag' => $row['tag'] !== '' ? $row['tag'] : null,
        ];
        if ($row['lane'] === 'alt') {
            $payload['roomsAlt'][] = $item;
        } else {
            $payload['rooms'][] = $item;
        }
    }
}

$result = $conn->query(
    'SELECT id, name, description, label, details_json, price, price_note, tone
     FROM vipward_packages
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC'
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $details = json_decode((string) $row['details_json'], true);
        $payload['packages'][] = [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'description' => $row['description'],
            'label' => $row['label'],
            'details' => is_array($details) ? $details : [],
            'price' => $row['price'],
            'priceNote' => $row['price_note'],
            'tone' => $row['tone'],
        ];
    }
}

$result = $conn->query(
    'SELECT id, tab_label, tab_icon, badge, season_label, name, description, tags_json, tone
     FROM vipward_amenities
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC'
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $tags = json_decode((string) $row['tags_json'], true);
        $payload['amenities'][] = [
            'id' => (string) $row['id'],
            'tabLabel' => $row['tab_label'],
            'tabIcon' => $row['tab_icon'],
            'badge' => $row['badge'],
            'seasonLabel' => $row['season_label'],
            'name' => $row['name'],
            'description' => $row['description'],
            'tags' => is_array($tags) ? $tags : [],
            'tone' => $row['tone'],
        ];
    }
}

$result = $conn->query(
    'SELECT step_num, title, body_text
     FROM vipward_steps
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC'
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $payload['steps'][] = [
            'num' => $row['step_num'],
            'title' => $row['title'],
            'text' => $row['body_text'],
        ];
    }
}

$result = $conn->query(
    'SELECT title, body_text
     FROM vipward_perks
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC'
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $payload['perks'][] = [
            'title' => $row['title'],
            'text' => $row['body_text'],
        ];
    }
}

$result = $conn->query(
    'SELECT label, is_filled, is_reward
     FROM vipward_rights
     WHERE is_active = 1
     ORDER BY sort_order ASC, id ASC'
);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $payload['rights'][] = [
            'label' => $row['label'],
            'filled' => intval($row['is_filled']) === 1,
            'reward' => intval($row['is_reward']) === 1,
        ];
    }
}

$payload['source'] = 'mysql';
$payload['note'] = 'อ่านจากตาราง vipward_* ใน cpkhospita_cpkdoctor';

vip_json($payload);
