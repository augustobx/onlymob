<?php
// panel/api/garage_leases_terminate.php
require __DIR__ . '/../includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit;
}

$leaseId = intval($_POST['lease_id'] ?? 0);
if ($leaseId < 1) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'lease_id inválido']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1) Marcar el contrato como terminado
    $stmt = $pdo->prepare("UPDATE garage_leases SET status = 'terminated' WHERE id = ?");
    $stmt->execute([$leaseId]);

    // 2) Liberar todas las plazas asociadas
    $upd = $pdo->prepare("
      UPDATE garage_spaces gs
      JOIN garage_lease_spaces gls ON gls.space_id = gs.id
      SET gs.status = 'free'
      WHERE gls.lease_id = ?
    ");
    $upd->execute([$leaseId]);

    $pdo->commit();

    http_response_code(200);
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);

} catch (\Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
