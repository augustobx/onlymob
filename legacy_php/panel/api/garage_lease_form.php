<?php
// panel/api/garage_lease_form.php
require __DIR__ . '/../includes/auth_check.php';

$spaceId = intval($_GET['space_id'] ?? 0);
if ($spaceId < 1) {
    http_response_code(400);
    exit('Space ID inválido');
}

// 1) Traer datos de la plaza y la cochera
$stmt = $pdo->prepare("
  SELECT 
    gs.space_number, 
    g.address
  FROM garage_spaces gs
  JOIN garages g ON g.id = gs.garage_id
  WHERE gs.id = ?
");
$stmt->execute([$spaceId]);
$space = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$space) {
    http_response_code(404);
    exit('Plaza no encontrada');
}

// 2) Traer inquilinos para el <select>
$tenants = $pdo
  ->query("SELECT id, first_name, last_name FROM tenants ORDER BY last_name, first_name")
  ->fetchAll(PDO::FETCH_ASSOC);

// 3) Devolver SOLO el formulario (snippet HTML)
?>
<div class="space-y-4">
  <h3 class="text-xl font-semibold">
    Contrato Cochera <?= htmlspecialchars($space['space_number']) ?> – <?= htmlspecialchars($space['address']) ?>
  </h3>
  <form id="formGarageLease" class="space-y-3">
    <input type="hidden" name="space_id" value="<?= $spaceId ?>">

    <div>
      <label class="block text-sm font-medium">Inquilino</label>
      <select name="tenant_id" class="w-full border rounded px-3 py-2" required>
        <option value="">Selecciona...</option>
        <?php foreach ($tenants as $t): ?>
        <option value="<?= $t['id'] ?>">
          <?= htmlspecialchars("{$t['first_name']} {$t['last_name']}") ?>
        </option>
        <?php endforeach; ?>
      </select>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium">Inicio</label>
        <input name="start_date" type="date" class="w-full border rounded px-3 py-2" required>
      </div>
      <div>
        <label class="block text-sm font-medium">Fin</label>
        <input name="end_date" type="date" class="w-full border rounded px-3 py-2" required>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium">Alquiler</label>
      <input name="rent" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
    </div>

    <div>
      <label class="block text-sm font-medium">Depósito</label>
      <input name="deposit" type="number" step="0.01" class="w-full border rounded px-3 py-2" value="0" required>
    </div>

    <div>
      <label class="block text-sm font-medium">% Aumento</label>
      <input name="increase_percent" type="number" step="0.01" value="0" class="w-full border rounded px-3 py-2">
    </div>

    <div class="flex justify-end space-x-2 mt-4">
      <button type="button" id="cancelLease" class="px-4 py-2 border rounded">Cancelar</button>
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Guardar Contrato</button>
    </div>
  </form>
</div>
