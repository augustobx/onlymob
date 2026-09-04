<?php
// panel/api/garage_leases_create.php
require __DIR__ . '/../includes/auth_check.php';
$pdo->beginTransaction();

// 1) Sólo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

// 2) Recoger y validar datos
$spaceIds     = $_POST['space_ids']    ?? [];   // ahora un array
$tenantId     = intval($_POST['tenant_id']   ?? 0);
$startDate    = $_POST['start_date']   ?? '';
$endDate      = $_POST['end_date']     ?? '';
$rent         = floatval($_POST['rent']        ?? 0);
$deposit      = floatval($_POST['deposit']     ?? 0);
$increasePct  = floatval($_POST['increase_percent'] ?? 0);

$errors = [];
if (!is_array($spaceIds) || count($spaceIds) === 0) {
    $errors[] = 'Debes seleccionar al menos una plaza.';
}
if ($tenantId < 1)     $errors[] = 'Inquilino inválido.';
if (!$startDate)       $errors[] = 'Fecha de inicio requerida.';
if (!$endDate)         $errors[] = 'Fecha de fin requerida.';
if ($rent <= 0)        $errors[] = 'Alquiler debe ser mayor que 0.';

if ($errors) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['errors'=>$errors]);
    exit;
}

try {
    // 3) Insertar contrato (sin plaza)
    $stmt = $pdo->prepare("
      INSERT INTO garage_leases
        (tenant_id, start_date, end_date, rent, deposit, increase_percent)
      VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
      $tenantId, $startDate, $endDate,
      $rent, $deposit, $increasePct
    ]);
    $leaseId = $pdo->lastInsertId();

    // 4) Por cada plaza seleccionada
    $insSpace = $pdo->prepare("
      INSERT INTO garage_lease_spaces (lease_id, space_id)
      VALUES (?, ?)
    ");
    $updSpace = $pdo->prepare("
      UPDATE garage_spaces
      SET status = 'occupied'
      WHERE id = ?
    ");

    foreach ($spaceIds as $sid) {
        $sid = intval($sid);
        if ($sid < 1) continue;
        $insSpace->execute([$leaseId, $sid]);
        $updSpace->execute([$sid]);
    }

    $pdo->commit();

    // 5) Respuesta
    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode(['success'=>true, 'lease_id'=> $leaseId]);

} catch (\Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error'=>$e->getMessage()]);
}
