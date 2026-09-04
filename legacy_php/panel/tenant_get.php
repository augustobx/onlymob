<?php
require_once 'includes/auth_check.php';

header('Content-Type: application/json');
$id = $_GET['id'] ?? null;

if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID no provisto']);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM tenants WHERE id = ?");
$stmt->execute([$id]);
$tenant = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$tenant) {
    http_response_code(404);
    echo json_encode(['error' => 'Inquilino no encontrado']);
    exit();
}

echo json_encode($tenant);
?>