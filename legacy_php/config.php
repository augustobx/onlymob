<?php
// Carga el autoloader de Composer
require_once __DIR__ . '/vendor/autoload.php';

// Inicia la sesión si no está activa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Carga las variables de entorno desde .env
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

// -------------------------------------------------
// 1) Configuración de la aplicación (mail, etc.)
// -------------------------------------------------
// Añade estas entradas a tu .env:
// MAIL_MASS_SEND=true
// SMTP_HOST=smtp.tudominio.com
// SMTP_USER=usuario@tudominio.com
// SMTP_PASS=secret
// FROM_EMAIL=no-reply@tudominio.com
// FROM_NAME="Mi Inmobiliaria"
$appConfig = [
    'mail' => [
        'mass_send'  => filter_var($_ENV['MAIL_MASS_SEND'] ?? 'true', FILTER_VALIDATE_BOOLEAN),
        'smtp_host'  => $_ENV['SMTP_HOST']  ?? '',
        'smtp_user'  => $_ENV['SMTP_USER']  ?? '',
        'smtp_pass'  => $_ENV['SMTP_PASS']  ?? '',
        'from_email' => $_ENV['FROM_EMAIL'] ?? '',
        'from_name'  => $_ENV['FROM_NAME']  ?? '',
    ],
    // aquí podrías añadir más configuraciones globales
];

// Hacemos disponible la configuración global en toda la app
$GLOBALS['appConfig'] = $appConfig;

// -------------------------------------------------
// 2) Conexión a la base de datos (PDO)
// -------------------------------------------------
// Añade estas entradas a tu .env:
// DB_HOST=localhost
// DB_NAME=inmobiliaria
// DB_USER=root
// DB_PASS=
try {
    $host    = $_ENV['DB_HOST'];
    $dbname  = $_ENV['DB_NAME'];
    $user    = $_ENV['DB_USER'];
    $pass    = $_ENV['DB_PASS'];
    $charset = 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$dbname};charset={$charset}";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    // Retornamos el objeto PDO
    return new PDO($dsn, $user, $pass, $options);

} catch (\PDOException $e) {
    // Si falla la conexión, mostramos un error claro y detenemos la app
    die('Error de conexión a la base de datos: ' . $e->getMessage());
}
