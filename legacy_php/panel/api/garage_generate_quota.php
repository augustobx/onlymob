<?php
// panel/api/garage_generate_quota.php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

/* ─── 1. validar método ───────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

/* ─── 2. validar periodo (YYYY-MM) ────────────────── */
$period = $_POST['period'] ?? date('Y-m');
if (!preg_match('/^\d{4}-\d{2}$/', $period)) {
    http_response_code(400);
    echo json_encode(['error' => 'Periodo inválido']);
    exit;
}
$due = date('Y-m-t', strtotime("$period-01"));      // último día del mes

/* ─── 3. lógica con captura de errores ────────────── */
try {
    /* contratos vigentes + nº de plazas */
    $rows = $db->query("
        SELECT gl.id                    AS lease_id,
               gl.rent                  AS rent_unit,
               COUNT(gls.space_id)      AS plazas
        FROM garage_leases gl
        LEFT JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
        WHERE gl.status = 'current'
        GROUP BY gl.id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $db->beginTransaction();

    // … cabecera y validaciones igual …

$ins = $db->prepare("
    INSERT INTO garage_debts
      (garage_lease_id, type, description, amount, generated_at, due_date)
    VALUES (?, 'alquiler', ?, ?, NOW(), ?)
    ON DUPLICATE KEY UPDATE amount = VALUES(amount)
");


    foreach ($rows as $r) {
        $amount = round($r['rent_unit'] * $r['plazas'], 2);
        $desc   = "Alquiler $period ({$r['plazas']} plaza/s)";
        $ins->execute([$r['lease_id'], $desc, $amount, $due]);
    }

    $db->commit();
    echo json_encode(['success' => true, 'created' => count($rows)]);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
