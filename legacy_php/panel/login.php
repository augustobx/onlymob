<?php
// Incluimos la config, que inicia sesión y nos da la conexión a la BD en $pdo
$pdo = require __DIR__ . '/../config.php';

// Si el usuario ya está logueado, lo mandamos directo al dashboard
if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'admin') {
    header('Location: index.php');
    exit();
}

$error_message = '';

// Si el formulario fue enviado (es una petición POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Verificamos el usuario, la contraseña (con el hash) y el rol
    if ($user && password_verify($password, $user['password']) && $user['role'] === 'admin') {
        // Si todo es correcto, guardamos los datos en la sesión
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['user_name'] = $user['name']; // Guardamos el nombre para futuros usos
        
        // Redirigimos al dashboard
        header('Location: index.php');
        exit();
    } else {
        // Si algo falla, preparamos un mensaje de error
        $error_message = 'Credenciales incorrectas o sin permisos de administrador.';
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Acceso al Panel</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; }
        .login-card { width: 100%; max-width: 400px; }
    </style>
</head>
<body>
    <div class="card login-card">
        <div class="card-body">
            <h2 class="card-title text-center">Acceso al Panel</h2>

            <?php if (!empty($error_message)): ?>
                <div class="alert alert-danger mt-3"><?= htmlspecialchars($error_message) ?></div>
            <?php endif; ?>
            
            <form action="login.php" method="post" class="mt-3">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="email" name="email" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="password">Contraseña:</label>
                    <input type="password" id="password" name="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Ingresar</button>
            </form>
        </div>
    </div>
</body>
</html>