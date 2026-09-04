<?php
require_once 'includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit();
}
    
// Recoger datos del formulario
$id             = $_POST['id'] ?? null;
$property_id    = $_POST['property_id'];
$tenant_id      = $_POST['tenant_id'];
$start_date     = $_POST['start_date'];
$end_date       = $_POST['end_date'];
$rent           = (float)($_POST['rent'] ?? 0);
$deposit        = (float)($_POST['deposit'] ?? 0);
$update_period  = intval($_POST['update_period'] ?? 12);  // <-- nuevo campo
$status         = 'current'; // Un contrato guardado siempre está vigente

try {
    $pdo->beginTransaction();

    if ($id) {
        // 1. Obtenemos el monto de alquiler actual ANTES de cambiarlo.
        $stmt = $pdo->prepare("SELECT rent FROM leases WHERE id = ?");
        $stmt->execute([$id]);
        $oldRent = (float)$stmt->fetchColumn();

        // 2. Si el nuevo monto es diferente al anterior, guardamos en el historial.
        if ($rent !== $oldRent) {
            $historyStmt = $pdo->prepare(
                "INSERT INTO rent_history (lease_id, change_date, old_rent, new_rent) VALUES (?, CURDATE(), ?, ?)"
            );
            $historyStmt->execute([$id, $oldRent, $rent]);
        }
        
        // 3. Actualizamos el contrato, incluyendo el update_period
        $sql = "
          UPDATE leases
             SET property_id   = ?,
                 tenant_id     = ?,
                 start_date    = ?,
                 end_date      = ?,
                 rent          = ?,
                 deposit       = ?,
                 update_period = ?      -- <-- aquí
           WHERE id            = ?
        ";
        $updateStmt = $pdo->prepare($sql);
        $updateStmt->execute([
            $property_id,
            $tenant_id,
            $start_date,
            $end_date,
            $rent,
            $deposit,
            $update_period,   // <-- nuevo
            $id
        ]);

    } else {
        // INSERT, también guardamos el update_period
        $sql = "
          INSERT INTO leases
            (property_id, tenant_id, start_date, end_date,
             rent, deposit, update_period, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $property_id,
            $tenant_id,
            $start_date,
            $end_date,
            $rent,
            $deposit,
            $update_period,  // <-- nuevo
            $status
        ]);
    }

    $pdo->commit();
    http_response_code(200);
    echo json_encode(['message' => 'Contrato guardado con éxito']);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos: ' . $e->getMessage()]);
}
