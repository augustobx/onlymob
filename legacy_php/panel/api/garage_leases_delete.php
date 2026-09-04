<?php
// panel/api/garage_leases_delete.php
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

    // 1) Borrar pagos de deudas de cochera
    $pdo->prepare("
      DELETE gp FROM garage_payments gp
      JOIN garage_debts gd ON gd.id = gp.debt_id
      WHERE gd.garage_lease_id = ?
    ")->execute([$leaseId]);

    // 2) Borrar deudas de cochera
    $pdo->prepare("DELETE FROM garage_debts WHERE garage_lease_id = ?")
        ->execute([$leaseId]);

    // 3) Liberar plazas y limpiar enlace
    // (opcional: si prefieres borrar filas de garage_lease_spaces en vez de mantener histórico)
    $pdo->prepare("
      UPDATE garage_spaces gs
      JOIN garage_lease_spaces gls ON gls.space_id = gs.id
      SET gs.status = 'free'
      WHERE gls.lease_id = ?
    ")->execute([$leaseId]);

    // 4) Borrar enlaces plaza–contrato
    $pdo->prepare("DELETE FROM garage_lease_spaces WHERE lease_id = ?")
        ->execute([$leaseId]);

    // 5) Borrar el contrato
    $pdo->prepare("DELETE FROM garage_leases WHERE id = ?")
        ->execute([$leaseId]);

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
