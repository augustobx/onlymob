<?php
// pwa/tenant_login.php
// Ingreso de inquilinos

// Si viene logout…
if (isset($_GET['logout'])) {
    session_start();
    session_destroy();
    header('Location: tenant_login.php');
    exit();
}

session_start();
// Si ya está logueado…
if (!empty($_SESSION['tenant_id'])) {
    header('Location: tenant_dashboard.php');
    exit();
}

// Cargamos el PDO de pwa/config.php
$pdo = require __DIR__ . '/config.php';

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare('SELECT * FROM tenants WHERE email = ?');
    $stmt->execute([$email]);
    $tenant = $stmt->fetch();

    if ($tenant
        && password_verify($password, $tenant['password_hash'])
        && $tenant['status'] === 'active'
    ) {
        $_SESSION['tenant_id']   = $tenant['id'];
        $_SESSION['tenant_name'] = $tenant['first_name'] . ' ' . $tenant['last_name'];
        header('Location: tenant_dashboard.php');
        exit();
    } else {
        $error = 'Credenciales inválidas o usuario inactivo.';
    }
}
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ingreso Inquilino</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body { display:flex; align-items:center; justify-content:center;
           height:100vh; margin:0; font-family:sans-serif;
           background:#f3f4f6; }
    .card { background:#fff; padding:2rem; border-radius:8px;
            box-shadow:0 2px 8px rgba(0,0,0,0.1); width:320px; }
    h1 { margin-top:0; font-size:1.5rem; text-align:center; }
    form { display:flex; flex-direction:column; }
    input { margin-bottom:1rem; padding:.5rem; font-size:1rem;
            border:1px solid #d1d5db; border-radius:4px; }
    button { padding:.75rem; background:#4f46e5; color:white;
             border:none; border-radius:4px; font-size:1rem;
             cursor:pointer; }
    .error { color:#b91c1c; margin-bottom:1rem; text-align:center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Ingreso Inquilino</h1>
    <?php if ($error): ?>
      <div class="error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="post">
      <input type="email" name="email" placeholder="Correo electrónico" required>
      <input type="password" name="password" placeholder="Contraseña" required>
      <button type="submit">Ingresar</button>
    </form>
  </div>
</body>
</html>
