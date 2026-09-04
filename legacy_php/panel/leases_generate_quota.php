<?php
// panel/leases_generate_quota.php
require __DIR__ . '/includes/auth_check.php';

// 1) Capturar input JSON (si viene del modal)
$input  = json_decode(file_get_contents('php://input'), true);
$period = $input['period'] ?? null;

// 2) Determinar mes de cuota y fecha de vencimiento
if ($period && DateTime::createFromFormat('Y-m', $period)) {
    // Si nos pasaron un periodo válido "YYYY-MM"
    $dt    = DateTime::createFromFormat('Y-m', $period);
    $desc  = 'Alquiler ' . $dt->format('F Y');
    // Vence el día 15 de ese mes
    $due   = $dt->format('Y-m') . '-15';
} else {
    // Por compatibilidad, si no hay periodo, tomo "mañana" +1 mes
    $today = new DateTime();
    $dt    = (clone $today)->modify('+1 month');
    $desc  = 'Alquiler ' . $dt->format('F Y');
    $due   = $dt->format('Y-m-d');
}

// 3) Iniciar transacción e insertar una deuda por cada contrato vigente
$pdo->beginTransaction();
try {
    $insDebt = $pdo->prepare("
      INSERT INTO debts (lease_id, type, description, amount, due_date)
      VALUES (?, 'alquiler', ?, ?, ?)
    ");

    // Traer todos los contratos vigentes
    $stmt = $pdo->query("
      SELECT l.id    AS lease_id,
             l.rent  AS old_rent,
             l.increase_percent
      FROM leases l
      WHERE l.status = 'current'
    ");

    while ($r = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // 4) Calcular monto con aumento
        $newRent = round($r['old_rent'] * (1 + $r['increase_percent']/100), 2);

        // 5) Insertar deuda con la descripción y vencimiento adecuados
        $insDebt->execute([
            $r['lease_id'],
            $desc,
            $newRent,
            $due
        ]);
    }

    $pdo->commit();
    header('Content-Type: application/json');
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => $e->getMessage()]);
}
