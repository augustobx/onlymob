<?php
/*********************************************************************
 *  Obtener ICL (Índice para Contratos de Locación) – BCRA
 *  Versión estable: toma SIEMPRE la fecha más reciente disponible
 *********************************************************************/
/*************** FUNCIÓN obtenerICL (fuente correcta) ***************/
function obtenerICL_CSV()
{
    $url = 'https://www.bcra.gob.ar/Downloads/CSV/7988_Indice_para_Contratos_de_Locacion.csv';

    /* 1. Descargar */
    $ctx = stream_context_create([
        'http' => ['timeout' => 15, 'header' => "User-Agent: PHP\r\n"],
        'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false] // TRUE + cacert.pem en prod
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) {
        return ['error' => 'Descarga fallida del CSV del BCRA'];
    }

    /* 2. Convertir a UTF-8 si viene en UTF-16 */
    if (strlen($raw) > 1 && in_array(substr($raw, 0, 2), ["\xFF\xFE", "\xFE\xFF"])) {
        $raw = iconv('UTF-16', 'UTF-8', $raw);
    }

    /* 3. Dividir en líneas (quita vacías) */
    $rows = array_reverse(
        array_values(
            array_filter(
                array_map('trim', preg_split("/\r\n|\n|\r/", $raw)),
                fn($r) => $r !== ''
            )
        )
    );

    /* 4. Buscar la primera línea válida fecha + valor */
    foreach ($rows as $row) {
        // Elimina comillas dobles y BOM
        $row = trim($row, "\"\xEF\xBB\xBF");

        // Prueba con “;” y luego “,”
        foreach ([';', ','] as $sep) {
            $parts = str_getcsv($row, $sep);
            if (count($parts) !== 2) continue;

            [$fecha, $valor] = array_map('trim', $parts);

            if (!preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $fecha)) continue;
            $v = str_replace(['.', ','], ['', '.'], $valor); // miles y decimal

            if (!is_numeric($v)) continue;

            return [
                'fecha' => $fecha,
                'valor' => number_format((float)$v, 4, ',', '.')
            ];
        }
    }

    return ['error' => 'No se halló una fila con fecha y valor en el CSV'];
}

$icl = obtenerICL_CSV();   // ← llamada





require_once __DIR__ . '/includes/header.php';


// Fechas para vencimientos
$hoy    = (new DateTime())->format('Y-m-d');
$limite = (new DateTime('+10 days'))->format('Y-m-d');

// 1) Alquileres vencidos
$sql = "
  SELECT COUNT(*) 
  FROM debts d
  JOIN leases l ON d.lease_id = l.id AND l.status = 'current'
  WHERE d.type = 'alquiler'
    AND (d.amount - COALESCE(d.paid_amount,0)) > 0
    AND d.due_date < ?
";
$stmt = $pdo->prepare($sql);
$stmt->execute([$hoy]);
$propVencidas = (int)$stmt->fetchColumn();

// 2) Alquileres por vencer (próx. 10 días)
$sql2 = str_replace('d.due_date < ?', 'd.due_date BETWEEN ? AND ?', $sql);
$stmt = $pdo->prepare($sql2);
$stmt->execute([$hoy, $limite]);
$propPorVencer = (int)$stmt->fetchColumn();

// 3) Cocheras vencidas
$sqlg = str_replace('leases', 'garage_leases', $sql);
$stmt = $pdo->prepare($sqlg);
$stmt->execute([$hoy]);
$garVencidas = (int)$stmt->fetchColumn();

// 4) Cocheras por vencer
$sqlg2 = str_replace('leases', 'garage_leases', $sql2);
$stmt = $pdo->prepare($sqlg2);
$stmt->execute([$hoy, $limite]);
$garPorVencer = (int)$stmt->fetchColumn();

// 5) Propiedades alquiladas
$stmt = $pdo->prepare("
  SELECT
    p.id            AS property_id,
    p.code,
    CONCAT(IFNULL(t.first_name,''),' ',IFNULL(t.last_name,'')) AS tenant,
    COALESCE(SUM(d.amount - d.paid_amount),0)            AS pending_debt
  FROM properties p
  JOIN leases l ON l.property_id = p.id AND l.status = 'current'
  LEFT JOIN tenants t ON t.id = l.tenant_id
  LEFT JOIN debts d   ON d.lease_id = l.id
  GROUP BY p.id,p.code,t.first_name,t.last_name
  ORDER BY p.code
");
$stmt->execute();
$leasedProperties = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 6) Propiedades libres
$stmt = $pdo->prepare("
  SELECT p.id AS property_id, p.code
  FROM properties p
  WHERE NOT EXISTS (
    SELECT 1 FROM leases l 
    WHERE l.property_id=p.id AND l.status='current'
  )
  ORDER BY p.code
");
$stmt->execute();
$freeProperties = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 7) Datos de cocheras y plazas
$stmt = $pdo->query("SELECT id,address FROM garages ORDER BY address");
$garageData = $stmt->fetchAll(PDO::FETCH_ASSOC);

$stmt = $pdo->query("
  SELECT 
    gs.id, gs.garage_id, gs.space_number,
    CASE WHEN gl.id IS NOT NULL THEN 'occupied' ELSE 'free' END AS status,
    CONCAT(t.first_name,' ',t.last_name) AS tenant_name
  FROM garage_spaces gs
  LEFT JOIN garage_leases gl
    ON gl.space_id=gs.id AND gl.status='current'
  LEFT JOIN tenants t
    ON t.id=gl.tenant_id
  ORDER BY gs.garage_id, CAST(gs.space_number AS UNSIGNED)
");
$spacesRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);
$spacesByGarage = [];
foreach ($spacesRaw as $s) {
  $spacesByGarage[$s['garage_id']][] = $s;
}
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

<?php if (empty($icl['error'])): ?>
  <div class="alert alert-info text-center mb-4" style="font-size:1.1rem;">
    📈 <strong>ICL (BCRA)</strong> al <strong><?= $icl['fecha'] ?></strong>:
    <span class="badge bg-primary"><?= $icl['valor'] ?></span>
  </div>
<?php else: ?>
  <div class="alert alert-warning text-center mb-4">
    ⚠️ <?= htmlspecialchars($icl['error']) ?>
  </div>
<?php endif; ?>


    <!-- RESUMEN VENCIMIENTOS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-red-500 text-white p-4 rounded-lg">
        <h3 class="font-bold">Alquileres vencidos</h3>
        <p class="text-3xl"><?= $propVencidas ?></p>
      </div>
      <div class="bg-yellow-400 text-gray-900 p-4 rounded-lg">
        <h3 class="font-bold">Alquileres por vencer</h3>
        <p class="text-3xl"><?= $propPorVencer ?></p>
      </div>
      <div class="bg-red-500 text-white p-4 rounded-lg">
        <h3 class="font-bold">Cocheras vencidas</h3>
        <p class="text-3xl"><?= $garVencidas ?></p>
      </div>
      <div class="bg-yellow-400 text-gray-900 p-4 rounded-lg">
        <h3 class="font-bold">Cocheras por vencer</h3>
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

  <div class="px-6 py-4 border-t space-y-4">
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
          $has  = $pend>0;
          $bg   = $has ? 'bg-amber-500' : 'bg-emerald-500';
          $msg  = $has
                 ? "⚠️ Pagos pendientes ($".number_format($pend,2).")"
                 : "✔️ Al día";
        ?>
        <a href="property_view.php?id=<?= $p['property_id'] ?>"
           class="p-4 rounded-lg <?= $bg ?> text-white hover:opacity-90 transition">
          <h3 class="font-bold text-xl"><?= htmlspecialchars($p['code']) ?></h3>
          <p class="text-sm"><?= htmlspecialchars($p['tenant']) ?></p>
          <p class="mt-2 text-sm"><?= $msg ?></p>
        </a>
        <?php endforeach; ?>
        <?php if(empty($leasedProperties)): ?>
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
           class="p-4 rounded-lg bg-emerald-500 text-white hover:opacity-90 transition">
          <h3 class="font-bold text-xl"><?= htmlspecialchars($p['code']) ?></h3>
          <p class="mt-2 text-sm">✔️ Disponible</p>
        </a>
        <?php endforeach; ?>
        <?php if(empty($freeProperties)): ?>
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

  <div class="px-6 py-4 border-t space-y-4">
    <!-- Alquiladas -->
    <details open class="bg-gray-50 rounded-lg overflow-hidden">
      <summary class="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-100">
        <span class="font-semibold">Alquiladas</span>
        <svg class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div class="px-4 py-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <?php foreach($garageData as $g):
          $spaces   = $spacesByGarage[$g['id']] ?? [];
          foreach(array_filter($spaces, fn($s)=> $s['status']==='occupied') as $s):
        ?>
        <a href="garage_space_view.php?space_id=<?= $s['id'] ?>"
           class="p-4 rounded-lg bg-amber-500 text-white hover:opacity-90 transition">
          <h3 class="font-bold text-xl">Plaza <?= htmlspecialchars($s['space_number']) ?></h3>
          <p class="mt-1 text-sm"><?= htmlspecialchars($s['tenant_name']) ?></p>
        </a>
        <?php endforeach; endforeach; ?>
        <?php if (!array_filter($spacesRaw, fn($s)=> $s['status']==='occupied')): ?>
          <p class="col-span-full text-center text-gray-500">No hay plazas alquiladas.</p>
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
        <?php foreach($garageData as $g):
          $spaces   = $spacesByGarage[$g['id']] ?? [];
          foreach(array_filter($spaces, fn($s)=> $s['status']==='free') as $s):
        ?>
        <div class="p-4 rounded-lg bg-emerald-500 text-white hover:opacity-90 transition">
          <h3 class="font-bold text-xl">Plaza <?= htmlspecialchars($s['space_number']) ?></h3>
          <button
              class="mt-2 btnNewLeaseIndex bg-white text-green-600 px-3 py-1 rounded text-sm"
              data-space-id="<?= $s['id'] ?>"
            >+ Contrato</button>
        </div>
        <?php endforeach; endforeach; ?>
        <?php if (!array_filter($spacesRaw, fn($s)=> $s['status']==='free')): ?>
          <p class="col-span-full text-center text-gray-500">No hay plazas libres.</p>
        <?php endif; ?>
      </div>
    </details>
  </div>
</details>


  </main>
  <?php include __DIR__ . '/includes/footer.php'; ?>

  <script>
    // Toggle de secciones
    const btnInm  = document.getElementById('btnInmueble'),
          btnCoc = document.getElementById('btnCochera'),
          secInm = document.getElementById('sectionInmueble'),
          secCoc = document.getElementById('sectionCochera');

    btnInm.onclick = () => {
      secInm.classList.remove('hidden');
      secCoc.classList.add('hidden');
    };
    btnCoc.onclick = () => {
      secInm.classList.add('hidden');
      secCoc.classList.remove('hidden');
    };
    btnInm.click();  // muestra Inmuebles por defecto

    // Modal de Contrato Cochera
    const modalLease      = document.getElementById('modalLease'),
          closeLeaseModal = document.getElementById('closeLeaseModal');
    let currentGarageId   = null;

    async function loadLeaseForm(spaceId) {
      const res  = await fetch(`api/garage_lease_form.php?space_id=${spaceId}`);
      const html = await res.text();
      document.getElementById('leaseFormContainer').innerHTML = html;
      document.getElementById('cancelLease').onclick = () => modalLease.classList.add('hidden');
      document.getElementById('formGarageLease').onsubmit = async e => {
        e.preventDefault();
        const data = new FormData(e.target);
        const r2 = await fetch('api/garage_leases_create.php',{method:'POST',body:data});
        if (r2.ok) {
          modalLease.classList.add('hidden');
          // recarga espacio
          document.querySelector(`.btnViewSpaces[data-garage-id="${currentGarageId}"]`).click();
        } else alert('Error al guardar contrato');
      };
    }

    // Bind +Contrato en dashboard
    document.querySelectorAll('.btnNewLeaseIndex').forEach(btn => {
      btn.onclick = () => {
        currentGarageId = btn.dataset.garageId;
        loadLeaseForm(btn.dataset.spaceId);
        modalLease.classList.remove('hidden');
      };
    });
    closeLeaseModal.onclick = () => modalLease.classList.add('hidden');

    // Animar flechas de <details>
    document.querySelectorAll('details').forEach(d => {
      d.addEventListener('toggle', () => {
        const svg = d.querySelector('svg');
        if (d.open) svg.classList.add('rotate-180');
        else svg.classList.remove('rotate-180');
      });
    });
  </script>
</body>
</html>
