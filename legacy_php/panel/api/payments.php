<?php
// panel/api/payments.php
require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

// Solo POST permitido
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Leer y sanitizar datos
$debt_id = intval($_POST['debt_id'] ?? 0);
$amount  = floatval($_POST['amount']   ?? 0);
$method  = trim($_POST['method']     ?? '');

// Validaciones básicas
$errors = [];
if ($debt_id <= 0)               $errors[] = 'debt_id inválido';
if ($amount <= 0)                $errors[] = 'amount debe ser mayor que 0';
if (!in_array($method, ['efectivo','transferencia','tarjeta'])) $errors[] = 'method inválido';

// Verificar existencia de la deuda
if (!$errors) {
    $stmt = $db->prepare('SELECT amount, paid_amount FROM debts WHERE id = ?');
    $stmt->execute([$debt_id]);
    $debt = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$debt) {
        $errors[] = 'Deuda no encontrada';
    }
}

if ($errors) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
}

// Calcular nuevo paid_amount y validar no exceder
$new_paid = $debt['paid_amount'] + $amount;
if ($new_paid > $debt['amount']) {
    http_response_code(400);
    echo json_encode(['error' => 'El pago excede el monto adeudado']);
    exit;
}

// Ejecutar en transacción
try {
    $db->beginTransaction();

    // 1) Insertar en debt_payments con método
    $stmt = $db->prepare(
        'INSERT INTO debt_payments (debt_id, amount, method) VALUES (?, ?, ?)'
    );
    $stmt->execute([$debt_id, $amount, $method]);

    // 2) Actualizar paid_amount en debts
    $stmt = $db->prepare('UPDATE debts SET paid_amount = paid_amount + ? WHERE id = ?');
    $stmt->execute([$amount, $debt_id]);

    $db->commit();

    http_response_code(200);
    echo json_encode(['paid_amount' => $new_paid]);
} catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos']);
}
