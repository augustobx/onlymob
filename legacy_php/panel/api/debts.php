// panel/api/debts.php
<?php
require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Leer datos
$lease_id    = intval($_POST['lease_id'] ?? 0);
$type        = $_POST['type'] ?? '';
$description = trim($_POST['description'] ?? '');
$amount      = floatval($_POST['amount'] ?? 0);
$due_date    = $_POST['due_date'] ?? '';

// Validación básica
$errors = [];
if (!$lease_id)    $errors[] = 'lease_id inválido';
if (!in_array($type, ['alquiler','deposito','luz','gas','agua','otros'])) $errors[] = 'type inválido';
if ($description === '') $errors[] = 'description requerido';
if ($amount <= 0) $errors[] = 'amount debe ser mayor que 0';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $due_date)) $errors[] = 'due_date inválido';

if ($errors) {
    http_response_code(400);
    echo json_encode(['errors' => $errors]);
    exit;
}

// Insertar deuda
try {
    $stmt = $db->prepare(
        'INSERT INTO debts (lease_id, type, description, amount, due_date) VALUES (?, ?, ?, ?, ?)'  
    );
    $stmt->execute([$lease_id, $type, $description, $amount, $due_date]);
    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos']);
}
