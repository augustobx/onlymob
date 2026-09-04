<?php
// panel/api/contracts_update.php
require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'Método no permitido']);
    exit;
}

// Leer y sanitizar
$lease_id         = intval($_POST['lease_id'] ?? 0);
$start_date       = $_POST['start_date'] ?? '';
$end_date         = $_POST['end_date'] ?? '';
$rent             = floatval($_POST['rent'] ?? 0);
$deposit          = floatval($_POST['deposit'] ?? 0);
$increase_percent = floatval($_POST['increase_percent'] ?? 0);

$errors = [];
if (!$lease_id) $errors[] = 'lease_id inválido';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$start_date)) $errors[]='start_date inválido';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$end_date))   $errors[]='end_date inválido';
if ($rent <= 0)        $errors[]='rent debe ser > 0';
if ($deposit < 0)      $errors[]='deposit no puede ser negativo';
if ($increase_percent < 0) $errors[]='increase_percent no puede ser negativo';

if ($errors) {
    http_response_code(400);
    echo json_encode(['errors'=>$errors]);
    exit;
}

try {
    $stmt = $db->prepare("
      UPDATE leases
      SET start_date       = ?,
          end_date         = ?,
          rent             = ?,
          deposit          = ?,
          increase_percent = ?
      WHERE id = ?
    ");
    $stmt->execute([
      $start_date,
      $end_date,
      $rent,
      $deposit,
      $increase_percent,
      $lease_id
    ]);
    echo json_encode(['success'=>true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error'=>'Error de base de datos']);
}
