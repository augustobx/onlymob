<?php
require_once 'includes/header.php';

// Valores por defecto para un formulario de creación
$property = [
    'id' => null, 'code' => '', 'address' => '', 'type' => 'Departamento', 'rooms' => null, 
    'sqm' => null, 'price_rent' => null, 'expenses_share' => null
];
$pageTitle = 'Crear Nueva Propiedad';
$isEdit = false;

// Si recibimos un ID por la URL, cargamos los datos para editar
if (isset($_GET['id'])) {
    $isEdit = true;
    $pageTitle = 'Editar Propiedad';
    $stmt = $pdo->prepare('SELECT * FROM properties WHERE id = ?');
    $stmt->execute([$_GET['id']]);
    $property_data = $stmt->fetch();
    if ($property_data) {
        $property = $property_data;
    }
}
?>

<header class="bg-white shadow">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900"><?= htmlspecialchars($pageTitle) ?></h1>
    </div>
</header>
<section class="p-6">
    <div class="bg-white p-8 rounded-xl shadow-md">
        <form action="property_save.php" method="POST">
            <?php if ($isEdit): ?>
                <input type="hidden" name="id" value="<?= $property['id'] ?>">
            <?php endif; ?>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label for="code" class="block text-sm font-medium text-gray-700">Código</label>
                    <input type="text" name="code" id="code" value="<?= htmlspecialchars($property['code']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                </div>
                <div>
                    <label for="type" class="block text-sm font-medium text-gray-700">Tipo</label>
                    <select name="type" id="type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        <option value="Departamento" <?= ($property['type'] ?? '') == 'Departamento' ? 'selected' : '' ?>>Departamento</option>
                        <option value="Casa" <?= ($property['type'] ?? '') == 'Casa' ? 'selected' : '' ?>>Casa</option>
                        <option value="Local" <?= ($property['type'] ?? '') == 'Local' ? 'selected' : '' ?>>Local</option>
                        <option value="Terreno" <?= ($property['type'] ?? '') == 'Terreno' ? 'selected' : '' ?>>Terreno</option>
                    </select>
                </div>
                <div class="md:col-span-2">
                    <label for="address" class="block text-sm font-medium text-gray-700">Dirección</label>
                    <input type="text" name="address" id="address" value="<?= htmlspecialchars($property['address']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                </div>
                <div>
                    <label for="rooms" class="block text-sm font-medium text-gray-700">Ambientes</label>
                    <input type="number" name="rooms" id="rooms" value="<?= htmlspecialchars($property['rooms']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>
                <div>
                    <label for="sqm" class="block text-sm font-medium text-gray-700">Metros Cuadrados (m²)</label>
                    <input type="number" step="0.01" name="sqm" id="sqm" value="<?= htmlspecialchars($property['sqm']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>
                <div>
                    <label for="price_rent" class="block text-sm font-medium text-gray-700">Precio Alquiler</label>
                    <input type="number" step="0.01" name="price_rent" id="price_rent" value="<?= htmlspecialchars($property['price_rent']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>
                <div>
                    <label for="expenses_share" class="block text-sm font-medium text-gray-700">% Expensas a cargo inquilino</label>
                    <input type="number" step="0.01" name="expenses_share" id="expenses_share" value="<?= htmlspecialchars($property['expenses_share']) ?>" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                </div>
            </div>

            <div class="mt-6 flex justify-end gap-4">
                <a href="properties.php" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</a>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Guardar Propiedad</button>
            </div>
        </form>
    </div>
</section>

<?php require_once 'includes/footer.php'; ?>