<?php
// pwa/config.php
// Configuración de conexión a la base de datos para la PWA de inquilinos

// Arranca la sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Parámetros de conexión (ajusta según tu .env o entorno)
$host    = 'localhost';
$dbname  = 'c2801249_sm2';
$user    = 'c2801249_sm2';
$pass    = 'rege47nuPO';
$charset = 'utf8mb4';

$dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    die('Error de conexión PWA: ' . $e->getMessage());
}

// Exportamos $pdo
return $pdo;