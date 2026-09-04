<?php
// api/garage_leases_update.php
require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

// Recoger datos
$lease_id = intval($_POST['lease_id'] ?? 0);
$rent     = floatval($_POST['rent'] ?? 0);
$pct      = floatval($_POST['increase_percent'] ?? 0);
$start    = $_POST['start_date'] ?? '';
$end      = $_POST['end_date']   ?? '';

if ($lease_id < 1 || !$start || !$end) {
    http_response_code(400);
    echo json_encode(['error'=>'Datos incompletos']);
    exit;
}

// 1) Calcular nuevo rent con el % si éste viene mayor a cero
if ($pct > 0) {
    $rent = $rent * (1 + $pct/100);
}

// 2) Actualizar y resetear el pct
$stmt = $db->prepare("
    UPDATE garage_leases
       SET rent = :rent,
           increase_percent = 0,
           start_date = :start,
           end_date   = :end
     WHERE id = :id
");
$stmt->execute([
    ':rent'  => $rent,
    ':start' => $start,
    ':end'   => $end,
    ':id'    => $lease_id
]);

echo json_encode(['success'=>true]);
