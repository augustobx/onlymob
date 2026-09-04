<?php
// panel/api/garage_debts.php  (GENERAR deudas individuales desde garage_space_view)
require __DIR__.'/../includes/auth_check.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error'=>'Método no permitido']); exit;
}

$db = $pdo;

$leaseId     = (int)($_POST['lease_id']     ?? 0);
$type        = trim($_POST['type']        ?? '');
$description = trim($_POST['description'] ?? '');
$amount      = (float)($_POST['amount']   ?? 0);
$dueDate     = $_POST['due_date']         ?? '';

if ($leaseId<1||$type===''||$description===''||$amount<=0||!preg_match('/^\d{4}-\d{2}-\d{2}$/',$dueDate)){
    http_response_code(400);
    echo json_encode(['error'=>'Datos incompletos o inválidos']); exit;
}

try{
    $db->prepare("
        INSERT INTO garage_debts
          (garage_lease_id,type,description,amount,generated_at,due_date)
        VALUES (?,?,?,?,NOW(),?)
    ")->execute([$leaseId,$type,$description,$amount,$dueDate]);
    echo json_encode(['success'=>true,'debt_id'=>$db->lastInsertId()]);
}catch(Exception $e){
    http_response_code(500);
    echo json_encode(['error'=>$e->getMessage()]);
}
