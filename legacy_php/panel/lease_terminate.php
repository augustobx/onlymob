<?php
require_once 'includes/auth_check.php';

if (isset($_GET['id'])) {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("UPDATE leases SET status = 'terminated' WHERE id = ?");
    $stmt->execute([$id]);
}

header('Location: leases.php');
exit();
?>