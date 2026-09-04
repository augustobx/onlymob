<?php
// panel/garage_spaces.php
require __DIR__ . '/includes/auth_check.php';
$garageId = intval($_GET['garage_id'] ?? 0);
if (!$garageId) {
    http_response_code(400);
    exit;
}

// 1) Obtener todos los espacios de la cochera y posible contrato
$stmt = $pdo->prepare("
  SELECT
    gs.id,
    gs.space_number,
    gs.status,
    CONCAT(t.first_name,' ',t.last_name) AS tenant_name
  FROM garage_spaces gs
  -- Relación N–M: plaza → contrato
  LEFT JOIN garage_lease_spaces gls
    ON gls.space_id = gs.id
  LEFT JOIN garage_leases gl
    ON gl.id = gls.lease_id
   AND gl.status = 'current'
  LEFT JOIN tenants t
    ON t.id = gl.tenant_id
  WHERE gs.garage_id = ?
  ORDER BY CAST(gs.space_number AS UNSIGNED), gs.space_number
");
$stmt->execute([$garageId]);
$spaces = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2) Renderizar sólo los bloques de espacios (sin <html> ni <head>)
foreach ($spaces as $s): ?>
  <div class="p-4 rounded-lg <?= $s['status']==='free' ? 'bg-green-100' : 'bg-red-100' ?>">
    <p><strong>Plaza:</strong> <?= htmlspecialchars($s['space_number']) ?></p>
    <p><strong>Estado:</strong> <?= $s['status']==='free' ? 'Libre' : 'Ocupada' ?></p>
    <?php if ($s['status']==='free'): ?>
      <!--
      <button
        class="btnNewLease mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        data-space-id="<?= $s['id'] ?>"
      >+ Contrato</button>!-->
    <?php else: ?>
      <p class="mt-2 text-sm"><strong>Inquilino:</strong> <?= htmlspecialchars($s['tenant_name']) ?></p>
    <?php endif; ?>
  </div>
<?php endforeach; ?>
