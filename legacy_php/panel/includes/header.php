<?php
// Incluye el guardián de seguridad en cada página.
require_once __DIR__ . '/auth_check.php';

// Obtiene el nombre del archivo actual para resaltar el enlace activo en el menú.
$currentPage = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title><?= isset($pageTitle) ? htmlspecialchars($pageTitle) . ' - ' : '' ?>Panel de Administración</title>
</head>
<body class="bg-gray-100 min-h-screen flex">

    <aside class="fixed top-0 left-0 h-full w-52 bg-slate-800 text-gray-100 flex flex-col shadow-lg">
      <h2 class="text-xl font-semibold py-4 text-center border-b border-slate-700">
        Inmobiliaria
      </h2>
      <nav class="flex-1 px-4 py-6 space-y-2 text-sm">
      <a href="index.php" class="flex items-center gap-2 px-3 py-2 rounded <?= $currentPage == 'index.php' ? 'bg-slate-700' : 'hover:bg-slate-700' ?>">📊 Dashboard</a>
      <nav class="flex-1 px-4 py-6 space-y-2 text-sm">
        <h3>Inmubeles</h3>
        <a href="properties.php" class="flex items-center gap-2 px-3 py-2 rounded <?= ($currentPage == 'properties.php' || $currentPage == 'property_form.php') ? 'bg-slate-700' : 'hover:bg-slate-700' ?>">🏠 Propiedades</a>
        <a href="tenants.php" class="flex items-center gap-2 px-3 py-2 rounded <?= ($currentPage == 'tenants.php' || $currentPage == 'tenant_form.php') ? 'bg-slate-700' : 'hover:bg-slate-700' ?>">👥 Inquilinos</a>
        <a href="leases.php" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700">📄 Contratos</a>
        <div class="pt-4 mt-4 border-t border-slate-700">
        <h3>Cocheras</h3>
        <a href="cocheras.php" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700">🚗 Cocheras</a>
        <a href="leases_cocheras.php" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700">📄 Contratos</a>
        <div class="pt-4 mt-4 border-t border-slate-700"></div>
            <a href="settings.php" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700">⚙️ Configuracion</a>
            <a href="logout.php" class="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700">🔑 Cerrar Sesión</a>
        </div>
      </nav>
    </aside>

    <main class="flex-1 ml-52">