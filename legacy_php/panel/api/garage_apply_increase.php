<?php
// ¡Nada antes de <?php

// 1) Suprimir warnings y forzar JSON
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Capturar percent
$percent = floatval($_POST['percent'] ?? 0);
if ($percent <= 0) {
    http_response_code(400);
    echo json_encode(['error' => '% inválido']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Preparar statements
    $qSelect = $pdo->prepare("SELECT id, rent FROM garage_leases WHERE status = 'current'");
    $qUpdate = $pdo->prepare("UPDATE garage_leases SET rent = ? WHERE id = ?");
    $qHist   = $pdo->prepare("
      INSERT INTO rent_history_cochera
        (lease_id, change_date, old_rent, new_rent, percent)
      VALUES (?, CURDATE(), ?, ?, ?)
    ");

    // Ejecutar
    $qSelect->execute();
    while ($row = $qSelect->fetch(PDO::FETCH_ASSOC)) {
        $leaseId = (int)$row['id'];
        $old      = floatval($row['rent']);
        $new      = round($old * (1 + $percent/100), 2);

        $qUpdate->execute([$new, $leaseId]);
        $qHist->execute([$leaseId, $old, $new, $percent]);
    }

    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
exit;
