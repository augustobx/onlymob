<?php
// panel/api/garages_create.php
require __DIR__ . '/../includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD']!=='POST') {
  http_response_code(405);
  exit;
}

$address      = trim($_POST['address'] ?? '');
$total_spaces = intval($_POST['total_spaces'] ?? 0);
if (!$address || $total_spaces<1) {
  http_response_code(400);
  exit;
}

$pdo->beginTransaction();
try {
  // 1) Insertar cochera
  $stmt = $pdo->prepare("INSERT INTO garages (address, total_spaces) VALUES (?,?)");
  $stmt->execute([$address, $total_spaces]);
  $garageId = $pdo->lastInsertId();

  // 2) Crear plazas
  $ins = $pdo->prepare("INSERT INTO garage_spaces (garage_id, space_number) VALUES (?,?)");
  for($i=1;$i<=$total_spaces;$i++){
    $ins->execute([$garageId, (string)$i]);
  }

  $pdo->commit();
  http_response_code(200);
} catch(Exception $e) {
  $pdo->rollBack();
  http_response_code(500);
}
