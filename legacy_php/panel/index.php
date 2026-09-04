<?php
// panel/index.php
require_once __DIR__ . '/includes/header.php';
$db = $pdo;
// — Fechas para métricas
$hoy    = (new DateTime())->format('Y-m-d');
$limite = (new DateTime('+10 days'))->format('Y-m-d');

// — Métricas de vencimiento (propiedades y cocheras)
$stmt = $pdo->prepare("
  SELECT COUNT(*)
  FROM debts d
  JOIN leases l ON d.lease_id=l.id AND l.status='current'
  WHERE d.type='alquiler'
    AND (d.amount-COALESCE(d.paid_amount,0))>0
    AND d.due_date < ?
");
$stmt->execute([$hoy]);
$propVencidas = (int)$stmt->fetchColumn();

$stmt = $pdo->prepare("
  SELECT COUNT(*)
  FROM debts d
  JOIN leases l ON d.lease_id=l.id AND l.status='current'
  WHERE d.type='alquiler'
    AND (d.amount-COALESCE(d.paid_amount,0))>0
    AND d.due_date BETWEEN ? AND ?
");
$stmt->execute([$hoy,$limite]);
$propPorVencer = (int)$stmt->fetchColumn();

// — Métricas para cocheras (usar garage_debts y garage_lease_id)
$stmt = $pdo->prepare("
  SELECT COUNT(*)
  FROM garage_debts d
  JOIN garage_leases l ON d.garage_lease_id=l.id AND l.status='current'
  WHERE d.type='alquiler'
    AND (d.amount-COALESCE(d.paid_amount,0))>0
    AND d.due_date < ?
");
$stmt->execute([$hoy]);
$garVencidas = (int)$stmt->fetchColumn();

$stmt = $pdo->prepare("
  SELECT COUNT(*)
  FROM garage_debts d
  JOIN garage_leases l ON d.garage_lease_id=l.id AND l.status='current'
  WHERE d.type='alquiler'
    AND (d.amount-COALESCE(d.paid_amount,0))>0
    AND d.due_date BETWEEN ? AND ?
");
$stmt->execute([$hoy,$limite]);
$garPorVencer = (int)$stmt->fetchColumn();

// — Propiedades alquiladas / libres
$stmt = $pdo->prepare("
  SELECT p.id AS property_id, p.code,
         CONCAT(IFNULL(t.first_name,''),' ',IFNULL(t.last_name,'')) AS tenant,
         COALESCE(SUM(d.amount-d.paid_amount),0) AS pending_debt
  FROM properties p
  JOIN leases l ON l.property_id=p.id AND l.status='current'
  LEFT JOIN tenants t ON t.id=l.tenant_id
  LEFT JOIN debts d   ON d.lease_id=l.id
  GROUP BY p.id,p.code,t.first_name,t.last_name
  ORDER BY p.code
");
$stmt->execute();
$leasedProperties = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("
  SELECT p.id AS property_id, p.code
  FROM properties p
  WHERE NOT EXISTS (
    SELECT 1 FROM leases l WHERE l.property_id=p.id AND l.status='current'
  )
  ORDER BY p.code
");
$stmt->execute();
$freeProperties = $stmt->fetchAll(PDO::FETCH_ASSOC);

// — Garages y plazas
$garageData = $pdo->query("SELECT id,address FROM garages ORDER BY address")
                  ->fetchAll(PDO::FETCH_ASSOC);

$spacesRaw = $pdo->query("
  SELECT
    gs.id,
    gs.garage_id,
    gs.space_number,
    gs.status,
    gls.lease_id
  FROM garage_spaces gs
  LEFT JOIN garage_lease_spaces gls ON gls.space_id=gs.id
  LEFT JOIN garage_leases gl        ON gl.id=gls.lease_id AND gl.status='current'
  ORDER BY gs.garage_id, CAST(gs.space_number AS UNSIGNED)
")->fetchAll(PDO::FETCH_ASSOC);

$spacesByGarage = [];
$leaseIds = [];
foreach($spacesRaw as $s){
  $spacesByGarage[$s['garage_id']][] = $s;
  if ($s['lease_id']) $leaseIds[] = $s['lease_id'];
}
$leaseIds = array_unique($leaseIds);

// — Deuda pendiente por contrato de cochera (usar garage_debts)
$debtsStmt = [];
if ($leaseIds) {
  $in = implode(',', array_map('intval',$leaseIds));
  $rows = $pdo->query("
    SELECT garage_lease_id AS lease_id,
           SUM(amount-COALESCE(paid_amount,0)) AS pending
    FROM garage_debts
    WHERE garage_lease_id IN ($in)
    GROUP BY garage_lease_id
  ")->fetchAll(PDO::FETCH_ASSOC);
  foreach($rows as $r){
    $debtsStmt[$r['lease_id']] = floatval($r['pending']);
  }
}

// 2) Recolectamos todos los lease_ids para calcular nombres
$leaseIds = [];
foreach($spacesRaw as $s){
  if ($s['lease_id']) $leaseIds[] = $s['lease_id'];
}
$leaseIds = array_unique($leaseIds);

// 3) Cargar deudas (repetido, también usar garage_debts)
$debtsStmt = [];
if ($leaseIds) {
  $in = implode(',', array_map('intval',$leaseIds));
  $rows = $pdo->query("
    SELECT garage_lease_id AS lease_id,
           SUM(amount-COALESCE(paid_amount,0)) AS pending
    FROM garage_debts
    WHERE garage_lease_id IN ($in)
    GROUP BY garage_lease_id
  ")->fetchAll(PDO::FETCH_ASSOC);
  foreach($rows as $r) {
    $debtsStmt[$r['lease_id']] = floatval($r['pending']);
  }
}

// 4) Cargar nombres de inquilinos (queda igual)
$leaseTenants = [];
if ($leaseIds) {
  $in = implode(',', array_map('intval',$leaseIds));
  $rows = $pdo->query("
    SELECT gl.id AS lease_id, CONCAT(t.first_name,' ',t.last_name) AS tenant
    FROM garage_leases gl
    JOIN tenants t ON t.id = gl.tenant_id
    WHERE gl.id IN ($in)
  ")->fetchAll(PDO::FETCH_ASSOC);
  foreach($rows as $r){
    $leaseTenants[$r['lease_id']] = $r['tenant'];
  }
}

/* ════════════════════════════════════════════════════════
   2. Cocheras
   — pendiente desde garage_debts
════════════════════════════════════════════════════════ */
$sqlGarages = "
  SELECT gl.id,
         g.address,
         (
           SELECT COALESCE(SUM(gd.amount - gd.paid_amount),0)
           FROM garage_debts gd
           WHERE gd.garage_lease_id = gl.id
         ) AS pending_debt,
         GROUP_CONCAT(gs.space_number
                      ORDER BY CAST(gs.space_number AS UNSIGNED)
                      SEPARATOR ', ') AS plazas
  FROM garage_leases gl
  JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
  JOIN garage_spaces       gs  ON gs.id        = gls.space_id
  JOIN garages             g   ON g.id         = gs.garage_id
  WHERE gl.status = 'current'
  GROUP BY gl.id
  ORDER BY g.address
";
$garages = $db->query($sqlGarages)->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Dashboard</title>
</head>
<body class="bg-gray-100 min-h-screen">
  <header class="bg-indigo-600 text-white py-4 text-center text-2xl font-semibold">
    Dashboard
  </header>
  <main class="max-w-6xl mx-auto p-6 space-y-12">

    <!-- Métricas -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-red-500 text-white p-4 rounded-lg">
        <h3 class="font-bold">Alq. vencidos</h3>
        <p class="text-3xl"><?= $propVencidas ?></p>
      </div>
      <div class="bg-yellow-400 text-gray-900 p-4 rounded-lg">
        <h3 class="font-bold">Alq. por vencer (10d)</h3>
        <p class="text-3xl"><?= $propPorVencer ?></p>
      </div>
      <div class="bg-red-500 text-white p-4 rounded-lg">
        <h3 class="font-bold">Coch. vencidas</h3>
        <p class="text-3xl"><?= $garVencidas ?></p>
      </div>
      <div class="bg-yellow-400 text-gray-900 p-4 rounded-lg">
        <h3 class="font-bold">Coch. por vencer (10d)</h3>
        <p class="text-3xl"><?= $garPorVencer ?></p>
      </div>
    </div>

        <!-- INMUEBLES -->
    <details open class="bg-white rounded-xl shadow overflow-hidden">
      <summary class="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-100">
        <span class="text-xl font-semibold">INMUEBLES</span>
        <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div class="px-6 py-4 space-y-4">
        <!-- Alquilados -->
        <details open class="bg-gray-50 rounded-lg overflow-hidden">
          <summary class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100">
            <span class="font-semibold">Alquilados</span>
            <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="px-4 py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach($leasedProperties as $p):
              $pend = floatval($p['pending_debt']);
              $bg   = $pend>0 ? 'bg-amber-500' : 'bg-emerald-500';
              $msg  = $pend>0
                      ? "⚠️ Pagos pendientes ($".number_format($pend,2).")"
                      : "✔️ Al día";
            ?>
            <a href="property_view.php?id=<?= $p['property_id'] ?>"
               class="p-4 rounded-lg <?= $bg ?> text-white hover:opacity-90">
              <h3 class="font-bold text-xl"><?= htmlspecialchars($p['code']) ?></h3>
              <p class="text-sm"><?= htmlspecialchars($p['tenant']) ?></p>
              <p class="mt-2 text-sm"><?= $msg ?></p>
            </a>
            <?php endforeach;
            if(empty($leasedProperties)): ?>
            <p class="col-span-full text-center text-gray-500">No hay propiedades alquiladas.</p>
            <?php endif; ?>
          </div>
        </details>
        <!-- Libres -->
        <details class="bg-gray-50 rounded-lg overflow-hidden">
          <summary class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100">
            <span class="font-semibold">Libres</span>
            <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="px-4 py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <?php foreach($freeProperties as $p): ?>
            <a href="property_view.php?id=<?= $p['property_id'] ?>"
               class="p-4 rounded-lg bg-emerald-500 text-white hover:opacity-90">
              <h3 class="font-bold text-xl"><?= htmlspecialchars($p['code']) ?></h3>
              <p class="mt-2 text-sm">✔️ Disponible</p>
            </a>
            <?php endforeach;
            if(empty($freeProperties)): ?>
            <p class="col-span-full text-center text-gray-500">No hay propiedades libres.</p>
            <?php endif; ?>
          </div>
        </details>
      </div>
    </details>

    <!-- COCHERAS -->
<details class="bg-white rounded-xl shadow overflow-hidden">
  <summary class="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-gray-100">
    <span class="text-xl font-semibold">COCHERAS</span>
    <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 9l-7 7-7-7" />
    </svg>
  </summary>
  <div class="px-6 py-4 space-y-6">
    <?php foreach($garageData as $g):
      $spaces   = $spacesByGarage[$g['id']] ?? [];
      // agrupo plazas ocupadas por contrato
      $occByLease = [];
      $freeSpaces = [];
      foreach($spaces as $s){
        if ($s['lease_id']) {
          $occByLease[$s['lease_id']][] = $s['space_number'];
        } else {
          $freeSpaces[] = $s['space_number'];
        }
      }
    ?>
    <div class="space-y-4">
      <h3 class="text-xl font-semibold"><?= htmlspecialchars($g['address']) ?></h3>

      <!-- Plazas alquiladas agrupadas por contrato -->
      <details open class="bg-gray-50 rounded-lg overflow-hidden">
        <summary class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100">
          <span class="font-semibold">Alquiladas (<?= count($occByLease) ?>)</span>
          <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div class="px-4 py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <?php if ($occByLease): foreach($occByLease as $leaseId=>$nums):
            $pend   = $debtsStmt[$leaseId] ?? 0;
            $bg     = $pend>0 ? 'bg-amber-500' : 'bg-emerald-500';
            $tenant = $leaseTenants[$leaseId] ?? '';
          ?>
          <a
            href="garage_space_view.php?lease_id=<?= $leaseId ?>"
            class="p-4 rounded-lg <?= $bg ?> text-white hover:opacity-90 transition"
          >
            <h4 class="font-bold"><?= htmlspecialchars($tenant) ?></h4>
            <p class="text-sm">Plazas: <?= implode(', ', $nums) ?></p>
          </a>
          <?php endforeach; else: ?>
          <p class="col-span-full text-center text-gray-500">No hay contratos activos.</p>
          <?php endif; ?>
        </div>
      </details>

      <!-- Plazas libres individuales -->
      <details class="bg-gray-50 rounded-lg overflow-hidden">
        <summary class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100">
          <span class="font-semibold">Libres (<?= count($freeSpaces) ?>)</span>
          <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div class="px-4 py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <?php if ($freeSpaces): foreach($freeSpaces as $num): ?>
          <div class="p-4 bg-emerald-100 rounded-lg">
            <h4 class="font-bold">Plaza <?= htmlspecialchars($num) ?></h4>
          </div>
          <?php endforeach; else: ?>
          <p class="col-span-full text-center text-gray-500">No hay plazas libres.</p>
          <?php endif; ?>
        </div>
      </details>
    </div>
    <?php endforeach; ?>
  </div>
</details>

  </main>
  <?php include __DIR__ . '/includes/footer.php'; ?>

  <script>
    // Animar las flechas de <details>
    document.querySelectorAll('details').forEach(d => {
      d.addEventListener('toggle', () => {
        const svg = d.querySelector('svg');
        svg.classList.toggle('rotate-180', d.open);
      });
    });
  </script>
</body>
</html>
