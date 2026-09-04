<?php
// Incluye la configuración, inicia sesión y nos da la conexión a la BD en la variable $pdo
$pdo = require __DIR__ . '/../../config.php';

// Si el usuario no ha iniciado sesión como admin, lo expulsamos a la página de login.
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header('Location: login.php');
    exit();
}
// Si la sesión es válida, el script continúa y la variable $pdo ya está disponible.