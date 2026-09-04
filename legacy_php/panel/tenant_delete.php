<?php
require_once 'includes/auth_check.php';

if (isset($_GET['id'])) {
    $id = $_GET['id'];
    $stmt = $pdo->prepare('DELETE FROM tenants WHERE id = ?');
    $stmt->execute([$id]);
}

header('Location: tenants.php');
exit();
?>