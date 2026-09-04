<?php
require __DIR__.'/../includes/auth_check.php';
header('Content-Type: application/json; charset=utf-8');

// 1) Sólo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// 2) Recoger y validar
$debtId = (int)($_POST['debt_id']  ?? 0);
$amount = (float)($_POST['amount'] ?? 0);
$method = trim($_POST['method']    ?? '');

if ($debtId < 1 || $amount <= 0 || $method === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

try {
    // 3) Iniciar transacción
    $pdo->beginTransaction();

    // 4) Actualizar deuda pendiente
    $upd = $pdo->prepare("
        UPDATE garage_debts
        SET paid_amount = paid_amount + ?
        WHERE id = ?
    ");
    $upd->execute([$amount, $debtId]);

    // 5) Registrar el pago
    $ins = $pdo->prepare("
        INSERT INTO garage_payments (debt_id, amount, method, paid_at)
        VALUES (?, ?, ?, NOW())
    ");
    $ins->execute([$debtId, $amount, $method]);

    $pdo->commit();
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
