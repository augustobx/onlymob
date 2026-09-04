<?php
// panel/leases_preview_increase.php

require __DIR__ . '/includes/auth_check.php';
$db = $pdo;

// 1) Leer JSON de entrada
$input = json_decode(file_get_contents('php://input'), true);
$pct    = isset($input['percent'])         ? floatval($input['percent'])        : null;
$period = isset($input['update_period'])   ? intval($input['update_period'])    : null;

if ($pct===null || $period===null) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error'=>'Debe enviar percent y update_period numéricos.']);
    exit;
}

// 2) Preparar consulta, filtrando por update_period si es > 0
if ($period > 0) {
    $stmt = $db->prepare("
        SELECT id AS lease_id, rent
        FROM leases
        WHERE status = 'current'
          AND update_period = ?
    ");
    $stmt->execute([$period]);
} else {
    // period == 0 → todos
    $stmt = $db->prepare("
        SELECT id AS lease_id, rent
        FROM leases
        WHERE status = 'current'
    ");
    $stmt->execute();
}

// 3) Construir respuesta
$data = [];
while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $old = (float)$r['rent'];
    $new = round($old * (1 + $pct/100), 2);
    $data[] = [
      'lease_id' => $r['lease_id'],
      'old_rent' => $old,
      'new_rent' => $new
    ];
}

// 4) Devolver JSON
header('Content-Type: application/json');
echo json_encode($data);
