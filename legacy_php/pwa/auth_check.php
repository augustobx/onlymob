<?php
// pwa/auth_check.php
// Verifica que el inquilino esté logueado, si no lo redirige al login

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (empty($_SESSION['tenant_id'])) {
    header('Location: tenant_login.php');
    exit();
}
