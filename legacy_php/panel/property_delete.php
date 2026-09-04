<?php
require_once 'includes/auth_check.php';

if (isset($_GET['id'])) {
    $id = $_GET['id'];
    // Para mayor seguridad, podríamos verificar si la propiedad tiene contratos activos antes de borrar.
    // Por ahora, la eliminación es directa.
    $stmt = $pdo->prepare('DELETE FROM properties WHERE id = ?');
    $stmt->execute([$id]);
}

header('Location: properties.php');
exit();
?>