<?php
require_once 'includes/auth_check.php';

header('Content-Type: application/json');
$id = $_GET['id'] ?? null;
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'ID no provisto']);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM properties WHERE id = ?");
$stmt->execute([$id]);
$property = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$property) {
    http_response_code(404);
    echo json_encode(['error' => 'Propiedad no encontrada']);
    exit();
}

echo json_encode($property);
?>