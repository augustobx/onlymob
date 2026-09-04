<?php
// panel/leases_apply_increase.php
require __DIR__ . '/includes/auth_check.php';
$db = $pdo;

// 1. Leer JSON
$input  = json_decode(file_get_contents('php://input'), true);
$pct    = isset($input['percent'])       ? floatval($input['percent'])     : null;
$period = isset($input['update_period']) ? intval($input['update_period']) : null;

if ($pct===null || $period===null) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error'=>'Debe enviar percent y update_period.']);
    exit;
}

try {
    $db->beginTransaction();

    // 2. Seleccionar contratos a actualizar
    if ($period > 0) {
        $qry = $db->prepare("
          SELECT id AS lease_id, rent
          FROM leases
          WHERE status='current'
            AND update_period = ?
        ");
        $qry->execute([$period]);
    } else {
        $qry = $db->query("
          SELECT id AS lease_id, rent
          FROM leases
          WHERE status='current'
        ");
    }

    // 3. Para cada contrato, insertar historial y actualizar rent + reset percent
    $histStmt = $db->prepare(
      "INSERT INTO rent_history (lease_id, change_date, old_rent, new_rent)
       VALUES (?, CURDATE(), ?, ?)"
    );
    $updStmt  = $db->prepare(
      "UPDATE leases
         SET rent = ?,
             increase_percent = 0
       WHERE id = ?"
    );

    while ($r = $qry->fetch(PDO::FETCH_ASSOC)) {
        $leaseId = $r['lease_id'];
        $oldRent = (float)$r['rent'];
        $newRent = round($oldRent * (1 + $pct/100), 2);

        // historial
        $histStmt->execute([$leaseId, $oldRent, $newRent]);
        // aplicar nuevo alquiler y dejar percent en 0
        $updStmt->execute([$newRent, $leaseId]);
    }

    $db->commit();
    header('Content-Type: application/json');
    echo json_encode(['message'=>'Aumento aplicado correctamente.']);

} catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error'=>'Error de BD: '.$e->getMessage()]);
}
