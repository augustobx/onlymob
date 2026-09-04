<?php
// panel/settings.php
$pageTitle = 'Configuraciones';
require __DIR__ . '/includes/auth_check.php';
require_once 'includes/header.php';
require_once 'includes/page_header.php';

// Manejo del POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $v = isset($_POST['mass_send']) && $_POST['mass_send'] === '1' ? '1' : '0';
    $stmt = $pdo->prepare("
      REPLACE INTO settings (`key`,`value`)
      VALUES ('mail.mass_send', ?)
    ");
    $stmt->execute([$v]);
    $message = 'Configuración guardada.';
}

// Leemos el valor actual
$stmt = $pdo->prepare("SELECT `value` FROM settings WHERE `key` = 'mail.mass_send'");
$stmt->execute();
$current = $stmt->fetchColumn();
$isActive = ($current === '1');
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Configuración de Envío de Emails</title>
</head>
<body class="bg-gray-100 min-h-screen">
  <main class="max-w-xl mx-auto p-6 space-y-4">
    <h1 class="text-2xl font-bold">Ajustes de Envío Masivo</h1>
    <?php if (!empty($message)): ?>
      <div class="p-3 bg-green-100 text-green-800 rounded"><?= htmlspecialchars($message) ?></div>
    <?php endif; ?>
    <form method="post" class="space-y-4 bg-white p-6 rounded-xl shadow">
      <label class="flex items-center space-x-3">
        <input 
          type="checkbox" 
          name="mass_send" 
          value="1" 
          <?= $isActive ? 'checked' : '' ?>
          class="h-5 w-5"
        >
        <span>Enviar correo automático al generar cuotas</span>
      </label>
      <button 
        type="submit"
        class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
      >Guardar cambios</button>
    </form>
  </main>
  <?php include __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
