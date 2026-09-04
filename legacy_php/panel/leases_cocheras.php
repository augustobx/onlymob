<?php

$pageTitle = 'Contratos de Cocheras';
require __DIR__ . '/includes/auth_check.php';
require_once 'includes/header.php';
require_once 'includes/page_header.php';

// Periodo actual para “+ Cuota”
$period = (new DateTime())->format('Y-m');

// 0) Leer filtro de estado (vigente, terminado o todos)
$statusFilter = $_GET['status'] ?? 'all';
if (!in_array($statusFilter, ['current','terminated','all'])) {
  $statusFilter = 'current';
}

// 1) Contratos de cochera según filtro
$where = $statusFilter === 'all'
    ? ''
    : 'WHERE gl.status = :statusFilter';

$sql = "
  SELECT
    gl.id                   AS lease_id,
    CONCAT(g.address,' – Plazas (', COUNT(gls.space_id), ')') AS unit,
    GROUP_CONCAT(gs.space_number
                 ORDER BY CAST(gs.space_number AS UNSIGNED)
                 SEPARATOR ', ')                       AS spaces_list,
    CONCAT(t.first_name,' ',t.last_name)                   AS tenant,
    gl.start_date,
    gl.end_date,
    gl.rent,
    COALESCE(SUM(d.amount - d.paid_amount), 0)             AS pending_debt,
    gl.status
  FROM garage_leases gl
  JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
  JOIN garage_spaces       gs  ON gs.id        = gls.space_id
  JOIN garages             g   ON g.id         = gs.garage_id
  LEFT JOIN tenants        t   ON t.id         = gl.tenant_id
  LEFT JOIN debts          d   ON d.lease_id   = gl.id
  $where
  GROUP BY
    gl.id, g.address, t.first_name, t.last_name,
    gl.start_date, gl.end_date, gl.rent, gl.status
  ORDER BY g.address
";

$stmt = $pdo->prepare($sql);
if ($statusFilter === 'all') {
    $stmt->execute();
} else {
    $stmt->execute(['statusFilter' => $statusFilter]);
}
$leases = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2) Para el modal “Nuevo Contrato”: todos los garages y espacios libres
$garages = $pdo->query("SELECT id, address FROM garages ORDER BY address")->fetchAll();
$spaces = $pdo->query("
  SELECT id, garage_id, space_number 
  FROM garage_spaces 
  WHERE status = 'free'
  ORDER BY garage_id, CAST(space_number AS UNSIGNED)
")->fetchAll();
$freeSpacesByGarage = [];
foreach ($spaces as $s) {
  $freeSpacesByGarage[$s['garage_id']][] = ['id'=>$s['id'],'number'=>$s['space_number']];
}

// 3) Inquilinos para el modal
$tenants = $pdo->query("
  SELECT id, first_name, last_name 
  FROM tenants 
  ORDER BY last_name, first_name
")->fetchAll();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Contratos de Cocheras</title>
</head>
<body class="bg-gray-100 min-h-screen">

  <div class="p-6 flex items-center space-x-4">
    <button id="btnNewContract" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">+ Nuevo Contrato</button>
    <button id="btnMassIncrease" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">+ Aumento</button>
    <button id="btnMassQuota"    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">+ Cuota</button>
    <!-- Selector de estado -->
    <form method="get" class="ml-auto">
      <label for="statusFilter" class="font-medium mr-2">Mostrar:</label>
      <select id="statusFilter" name="status"
              onchange="this.form.submit()"
              class="border rounded px-2 py-1">
        <option value="current"    <?= $statusFilter==='current'    ? 'selected' : '' ?>>Vigentes</option>
        <option value="terminated" <?= $statusFilter==='terminated' ? 'selected' : '' ?>>Terminados</option>
        <option value="all"        <?= $statusFilter==='all'        ? 'selected' : '' ?>>Todos</option>
      </select>
    </form>
  </div>

  <main class="bg-white p-6 rounded-xl shadow-md max-w-full overflow-x-auto">
    <table id="leases-table" class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th class="px-6 py-3">Cochera</th>
          <th class="px-6 py-3">Inquilino</th>
          <th class="px-6 py-3">Inicio</th>
          <th class="px-6 py-3">Fin</th>
          <th class="px-6 py-3">Alquiler</th>
          <th class="px-6 py-3">Deuda</th>
          <th class="px-6 py-3">Estado</th>
          <th class="px-6 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <?php if (empty($leases)): ?>
          <tr>
            <td colspan="8" class="px-6 py-4 text-center text-gray-500">
              No hay contratos de cocheras <?= $statusFilter==='terminated' ? 'terminados' : ($statusFilter==='all'?'':'activos') ?>.
            </td>
          </tr>
        <?php else: ?>
          <?php foreach ($leases as $l):
            $pending = (float)$l['pending_debt'];
            $hasDebt = $pending > 0;
            $isCurrent = $l['status'] === 'current';
          ?>
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4"><?= htmlspecialchars($l['unit']) ?></td>
            <td class="px-6 py-4"><?= htmlspecialchars($l['tenant']) ?></td>
            <td class="px-6 py-4"><?= date('d/m/Y',strtotime($l['start_date'])) ?></td>
            <td class="px-6 py-4"><?= date('d/m/Y',strtotime($l['end_date'])) ?></td>
            <td class="px-6 py-4">$<?= number_format($l['rent'],2) ?></td>
            <td class="px-6 py-4">$<?= number_format($pending,2) ?></td>
            <td class="px-6 py-4">
              <?php if ($hasDebt): ?>
                <span class="px-2 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Pendiente</span>
              <?php else: ?>
                <span class="px-2 text-xs font-semibold <?= $isCurrent?'text-green-800 bg-green-100':'text-gray-600 bg-gray-100' ?> rounded-full">
                  <?= $isCurrent?'Vigente':'Terminado' ?>
                </span>
              <?php endif; ?>
            </td>
            <td class="px-6 py-4 text-sm text-center space-x-2">
              <button onclick="loadEditLease(<?= $l['lease_id'] ?>)"
                      class="text-indigo-600 hover:text-indigo-900">Editar</button>
              <?php if ($isCurrent): ?>
                <button onclick="terminateLease(<?= $l['lease_id'] ?>)"
                        class="text-red-600 hover:text-red-900">Rescindir</button>
              <?php endif; ?>
              <!--<button onclick="deleteLease(<?= $l['lease_id'] ?>)"
                      class="text-red-600 hover:text-red-900">Eliminar</button>
                      !-->
            </td>
          </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </main>

  <?php include __DIR__. '/includes/footer.php'; ?>

<!-- Modal: Nuevo Contrato de Cocheras -->
<div id="modalNewContract" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-50">
  <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-auto max-h-[80vh] relative">
    <!-- Botón de cierre -->
    <button 
      id="closeNewContract"
      class="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl leading-none"
    >&times;</button>

    <h2 class="text-xl font-semibold mb-4">Nuevo Contrato de Cocheras</h2>
    <form id="formNewContract" class="space-y-4">
      <!-- Inquilino -->
      <div>
        <label class="block text-sm font-medium">Inquilino</label>
        <select name="tenant_id" required class="w-full border rounded px-3 py-2">
          <option value="">Selecciona...</option>
          <?php foreach($tenants as $t): ?>
            <option value="<?= $t['id'] ?>">
              <?= htmlspecialchars("{$t['first_name']} {$t['last_name']}") ?>
            </option>
          <?php endforeach; ?>
        </select>
      </div>

      <!-- Garage -->
      <div>
        <label class="block text-sm font-medium">Garage</label>
        <select id="selGarage" required class="w-full border rounded px-3 py-2">
          <option value="">Selecciona garage...</option>
          <?php foreach($garages as $g): ?>
            <option value="<?= $g['id'] ?>"><?= htmlspecialchars($g['address']) ?></option>
          <?php endforeach; ?>
        </select>
      </div>

      <!-- Plazas (múltiple) -->
      <div>
        <label class="block text-sm font-medium">Plazas</label>
        <select
          name="space_ids[]"
          id="selSpaces"
          multiple
          size="5"
          disabled
          required
          class="w-full border rounded px-3 py-2"
        ></select>
        <p class="text-xs text-gray-500 mt-1">
          Ctrl/Cmd + click para seleccionar varias.
        </p>
      </div>

      <!-- Fechas -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium">Fecha Inicio</label>
          <input
            name="start_date"
            type="date"
            required
            class="w-full border rounded px-3 py-2"
          >
        </div>
        <div>
          <label class="block text-sm font-medium">Fecha Fin</label>
          <input
            name="end_date"
            type="date"
            required
            class="w-full border rounded px-3 py-2"
          >
        </div>
      </div>

      <!-- Renta por plaza -->
      <div>
        <label class="block text-sm font-medium">Alquiler (por plaza)</label>
        <input
          name="rent"
          type="number"
          step="0.01"
          required
          class="w-full border rounded px-3 py-2"
        >
      </div>

      <!-- Botones -->
      <div class="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          id="closeNewContract"
          class="px-4 py-2 border rounded"
        >Cancelar</button>
        <button
          type="submit"
          class="px-4 py-2 bg-blue-600 text-white rounded"
        >Crear Contrato</button>
      </div>
    </form>
  </div>
</div>

  <!-- Modal: Aumento Masivo -->
  <div id="modalIncrease" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
    <div class="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
      <h2 class="text-xl font-semibold">Aumento Masivo</h2>
      <form id="formIncrease">
        <div>
          <label class="block text-sm font-medium">% Aumento</label>
          <input name="percent" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
        </div>
        <div class="flex justify-end space-x-2 pt-4">
          <button type="button" id="closeIncrease" class="px-4 py-2 border rounded">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-yellow-500 text-white rounded">Previsualizar</button>
        </div>
      </form>
      <div id="previewIncrease" class="mt-4 hidden">
        <h3 class="font-semibold">Previsualización</h3>
        <ul class="max-h-40 overflow-auto space-y-1"></ul>
        <div class="flex justify-end pt-2">
          <button id="applyIncrease" class="px-4 py-2 bg-yellow-500 text-white rounded">Aplicar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Generar Cuota -->
  <div id="modalQuota" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
    <div class="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
      <h2 class="text-xl font-semibold">Generar Cuota Mensual</h2>
      <p>Periodo: <?= htmlspecialchars($period) ?></p>
      <div class="flex justify-end space-x-2 pt-4">
        <button id="closeQuota" class="px-4 py-2 border rounded">Cancelar</button>
        <button id="confirmQuota" class="px-4 py-2 bg-green-600 text-white rounded">Confirmar</button>
      </div>
    </div>
  </div>

<script>
// Datos de plazas libres por garage (pasados desde PHP)
const freeSpacesByGarage = <?= json_encode($freeSpacesByGarage) ?>;

// Elementos del DOM
const selGarage  = document.getElementById('selGarage');
const selSpaces  = document.getElementById('selSpaces');
const modalNew   = document.getElementById('modalNewContract');
const btnOpen    = document.getElementById('btnNewContract');
const btnClose   = document.querySelectorAll('#closeNewContract');
const formNew    = document.getElementById('formNewContract');

// 1) Rellenar el <select multiple> al cambiar de garage
selGarage.addEventListener('change', () => {
  const gid = selGarage.value;
  selSpaces.innerHTML = '';
  if (freeSpacesByGarage[gid]?.length) {
    selSpaces.disabled = false;
    freeSpacesByGarage[gid].forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `Plaza ${s.number}`;
      selSpaces.append(opt);
    });
  } else {
    selSpaces.disabled = true;
  }
});

// 2) Abrir modal desde botón + Nuevo Contrato
btnOpen.addEventListener('click', () => {
  modalNew.classList.remove('hidden');
});

// 3) Cerrar modal desde cualquiera de los “X” o “Cancelar”
btnClose.forEach(btn => {
  btn.addEventListener('click', () => {
    modalNew.classList.add('hidden');
    formNew.reset();
    selSpaces.disabled = true;
  });
});

// 4) Enviar formulario con fetch (POST)
formNew.addEventListener('submit', async e => {
  e.preventDefault();
  const res  = await fetch('api/garage_leases_create.php', {
    method: 'POST',
    body: new FormData(formNew)
  });
  const json = await res.json();

  if (res.ok && json.success) {
    location.reload();
  } else {
    alert('Error al crear contrato:\n' + (json.error || 'Comprueba los datos'));
  }
});

// Modal Aumento Masivo
  const modalInc     = document.getElementById('modalIncrease'),
        formInc      = document.getElementById('formIncrease'),
        previewBox   = document.getElementById('previewIncrease'),
        previewList  = previewBox.querySelector('ul'),
        closeInc     = document.getElementById('closeIncrease'),
        applyInc     = document.getElementById('applyIncrease');
  document.getElementById('btnMassIncrease').onclick = () => modalInc.classList.remove('hidden');
  closeInc.onclick = () => {
    modalInc.classList.add('hidden');
    previewBox.classList.add('hidden');
    previewList.innerHTML = '';
    formInc.reset();
  };
  formInc.onsubmit = async e => {
    e.preventDefault();
    const r = await fetch('api/garage_preview_increase.php', {
      method:'POST', body:new FormData(formInc)
    });
    const data = await r.json();
    previewList.innerHTML = '';
    data.forEach(r => {
      previewList.innerHTML += `<li>${r.unit}: $${r.old_rent} → $${r.new_rent}</li>`;
    });
    previewBox.classList.remove('hidden');
  };
  applyInc.onclick = async () => {
    const r = await fetch('api/garage_apply_increase.php', {
      method:'POST', body:new FormData(formInc)
    });
    if (r.ok) location.reload();
    else alert('Error al aplicar aumento');
  };

/* ═══════════════════ Modal Generar Cuota ═══════════════════ */
const modalQt   = document.getElementById('modalQuota'),
      closeQt   = document.getElementById('closeQuota'),
      confirmQt = document.getElementById('confirmQuota');

document.getElementById('btnMassQuota').onclick = () => {
  modalQt.classList.remove('hidden');
};

closeQt.onclick = () => modalQt.classList.add('hidden');

confirmQt.onclick = async () => {
  /* 1. determinar periodo */
  const inpPeriodo = document.getElementById('periodoInput');   // puede ser null
  const periodo    = inpPeriodo ? inpPeriodo.value
                                : new Date().toISOString().substring(0, 7); // YYYY-MM

  /* 2. llamada a la API */
 const res = await fetch('api/garage_generate_quota.php', {   // ←  ✔  solo una coma
  method : 'POST',
  body   : new URLSearchParams({ period: periodo })
});

  /* 3. procesar respuesta */
  if (res.ok) {
    location.reload();                 // cuotas creadas/actualizadas
  } else {
    const err = await res.json().catch(() => ({ error: 'desconocido' }));
    alert('Error al generar cuotas: ' + err.error);
  }
};

  // Editar y Rescindir
  function loadEditLease(id) {
    window.location.href = `garage_space_view.php?space_id=${id}`;
  }
  function terminateLease(id) {
    if (!confirm('Confirmar rescindir contrato?')) return;
    fetch('api/garage_leases_terminate.php', {
      method:'POST', body:new URLSearchParams({ lease_id:id })
    }).then(r => r.ok ? location.reload() : alert('Error al rescindir'));
  }

  function deleteLease(id) {
  if (!confirm('Confirmar eliminación definitiva?')) return;
  fetch('api/garage_leases_delete.php', {
    method:'POST',
    body:new URLSearchParams({ lease_id: id })
  }).then(r => {
    if (r.ok) location.reload();
    else alert('Error al eliminar');
  });
}

</script>
</body>
</html>
