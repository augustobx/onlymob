<?php
// 1. Encabezado de página
$pageTitle    = 'Contratos de Alquiler';
$headerButton = '<button id="openModalBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm transition-colors">+ Nuevo Contrato</button>';

// 2. Incluimos los headers
require_once 'includes/header.php';
require_once 'includes/page_header.php';

// 3. Parámetros de orden dinámico
$allowedSort = [
  'property'   => 'CAST(p.code AS UNSIGNED)',  // <-- aquí
  'tenant'     => 't.last_name',
  'start_date' => 'l.start_date',
  'end_date'   => 'l.end_date',
  'rent'       => 'l.rent',
];
$sort = $_GET['sort'] ?? 'start_date';
$dir  = strtoupper($_GET['dir'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
$orderBy = $allowedSort[$sort] ?? $allowedSort['start_date'];

// 4. Obtenemos los contratos
$stmt = $pdo->prepare("
    SELECT 
        l.id,
        l.start_date,
        l.end_date,
        l.rent,
        l.status,
        l.update_period,
        p.code        AS property_code,
        CONCAT(t.first_name,' ',t.last_name) AS tenant_name
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    JOIN tenants    t ON l.tenant_id   = t.id
    ORDER BY $orderBy $dir
");
$stmt->execute();
$leases = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 5. Datos auxiliares
$allProperties      = $pdo->query("SELECT id, code, address FROM properties ORDER BY code")->fetchAll(PDO::FETCH_ASSOC);
$allTenants         = $pdo->query("SELECT id, first_name, last_name FROM tenants WHERE status='active' ORDER BY last_name, first_name")->fetchAll(PDO::FETCH_ASSOC);
$leasedPropertyIds  = $pdo->query("SELECT DISTINCT property_id FROM leases WHERE status='current'")->fetchAll(PDO::FETCH_COLUMN);
$updatePeriods      = $pdo->query("SELECT DISTINCT update_period FROM leases WHERE update_period IS NOT NULL ORDER BY update_period")->fetchAll(PDO::FETCH_COLUMN);
?>

<div class="p-6">
  <?= $headerButton ?>
  <button id="btnIncrease" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded">+ Aumento</button>
  <button id="btnQuota"    class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">+ Cuota</button>
  <button id="btnGenerateReceipts" class="bg-blue-600 text-white px-4 py-2 rounded">Generar Recibos</button>
</div>

<div class="bg-white p-6 rounded-xl shadow-md">
  <div class="overflow-x-auto">
    <table id="leases-table" class="w-full text-sm text-left text-gray-500">
      <thead class="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th class="px-6 py-3">
            <?php 
              $newDir = ($sort==='property' && $dir==='ASC') ? 'desc' : 'asc';
              $arrow  = $sort==='property' ? ($dir==='ASC' ? ' 🔼' : ' 🔽') : '';
            ?>
            <a href="?sort=property&dir=<?= $newDir ?>" class="hover:underline">
              Propiedad<?= $arrow ?>
            </a>
          </th>
          <th class="px-6 py-3">Inquilino</th>
          <th class="px-6 py-3">Inicio</th>
          <th class="px-6 py-3">Fin</th>
          <th class="px-6 py-3">Alquiler</th>
          <th class="px-6 py-3">Período</th>
          <th class="px-6 py-3">Estado</th>
          <th class="px-6 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <?php if (empty($leases)): ?>
          <tr>
            <td colspan="8" class="px-6 py-4 text-center">No hay contratos registrados.</td>
          </tr>
        <?php else: ?>
          <?php foreach ($leases as $lease): ?>
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 font-medium"><?= htmlspecialchars($lease['property_code']) ?></td>
              <td class="px-6 py-4"><?= htmlspecialchars($lease['tenant_name']) ?></td>
              <td class="px-6 py-4"><?= date("d/m/Y", strtotime($lease['start_date'])) ?></td>
              <td class="px-6 py-4"><?= date("d/m/Y", strtotime($lease['end_date'])) ?></td>
              <td class="px-6 py-4">$<?= number_format((float)$lease['rent'], 2) ?></td>
              <td class="px-6 py-4"><?= htmlspecialchars($lease['update_period']) ?> meses</td>
              <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full <?= $lease['status']=='current' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' ?>">
                  <?= $lease['status']=='current' ? 'Vigente' : 'Terminado' ?>
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button type="button"
                        class="font-medium text-indigo-600 hover:underline edit-btn"
                        data-id="<?= $lease['id'] ?>">
                  Editar
                </button>
                <?php if ($lease['status']=='current'): ?>
                  <a href="lease_terminate.php?id=<?= $lease['id'] ?>"
                     class="ml-4 font-medium text-red-600 hover:underline"
                     onclick="return confirm('¿Confirmas la rescisión de este contrato?');">
                    Rescindir
                  </a>
                <?php endif; ?>
              </td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

</div>

<div id="formModal"
     class="fixed inset-0 bg-gray-900 bg-opacity-75 hidden items-center justify-center p-4"
     style="z-index:100;">
  <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
    <h2 id="modalTitle" class="text-2xl font-bold mb-6"></h2>
    <form id="dataForm">
      <input type="hidden" name="id" id="id">

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Propiedad -->
        <div>
          <label for="property_id" class="block text-sm font-medium text-gray-700">Propiedad</label>
          <select name="property_id" id="property_id"
                  class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" required>
          </select>
        </div>
        <!-- Inquilino -->
        <div>
          <label for="tenant_id" class="block text-sm font-medium text-gray-700">Inquilino</label>
          <select name="tenant_id" id="tenant_id"
                  class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" required>
          </select>
        </div>
        <!-- Fecha Inicio -->
        <div>
          <label for="start_date" class="block text-sm font-medium text-gray-700">Fecha Inicio</label>
          <input type="date" name="start_date" id="start_date"
                 class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" required>
        </div>
        <!-- Fecha Fin -->
        <div>
          <label for="end_date" class="block text-sm font-medium text-gray-700">Fecha Fin</label>
          <input type="date" name="end_date" id="end_date"
                 class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" required>
        </div>
        <!-- Depósito -->
        <div>
          <label for="deposit" class="block text-sm font-medium text-gray-700">Depósito ($)</label>
          <input type="number" step="0.01" name="deposit" id="deposit"
                 class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" value="0" required>
        </div>
        <!-- Período de actualización -->
        <div>
          <label for="update_period" class="block text-sm font-medium text-gray-700">
            Período de actualización (meses)
          </label>
          <input name="update_period" id="update_period" type="number" min="1" value="12"
                 class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" required>
        </div>
        <!-- Alquiler / Aumento -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="rent" class="block text-sm font-medium text-gray-700">Monto Alquiler ($)</label>
            <input name="rent" id="rent" type="number" step="0.01"
                   class="w-full mt-1 px-3 py-2 border bg-gray-100 rounded-md" required>
          </div>
          <div id="increase-wrapper" class="hidden">
            <label for="increase_percent" class="block text-sm font-medium text-gray-700">Aumento (%)</label>
            <input id="increase_percent" type="number" step="0.01" placeholder="Ej: 30"
                   class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md">
          </div>
        </div>
      </div>

      <div class="mt-8 flex justify-end gap-4">
        <button type="button" id="cancelBtn"
                class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md">Cancelar</button>
        <button type="submit"
                class="bg-indigo-600 text-white px-4 py-2 rounded-md">Guardar Contrato</button>
      </div>
    </form>
  </div>
</div>

<!-- Modal Aumento Masivo -->
<div id="modalIncrease" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
  <div class="bg-white p-6 rounded-xl w-full max-w-lg">
    <h3 class="text-lg font-semibold mb-4">Aumento Masivo de Contratos</h3>
    <form id="formIncrease" class="space-y-4">
      <div>
        <label class="block text-sm font-medium">Período de actualización</label>
        <select id="increaseGroup" class="w-full border rounded px-3 py-2">
          <option value="">Todos</option>
          <?php foreach ($updatePeriods as $upd): ?>
            <option value="<?= $upd ?>"><?= $upd ?> mes(es)</option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium">% de Aumento</label>
        <input id="increasePct" name="percent" type="number" step="0.01" placeholder="20.00"
               class="w-full border rounded px-3 py-2" required>
      </div>
      <button type="button" id="btnPreviewIncrease" class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">
        Vista Previa
      </button>
      <div id="previewTable" class="mt-4 max-h-64 overflow-auto"></div>
      <div class="flex justify-end space-x-2">
        <button type="button" id="closeIncrease" class="px-4 py-2 rounded border">Cancelar</button>
        <button type="submit" id="btnApplyIncrease" class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded" disabled>
          Aplicar Aumento
        </button>
      </div>
    </form>
  </div>
</div>

<!-- Modal: Elegir mes para Generar Cuota e Imprimir Recibos -->
<div id="modalQuota" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
  <div class="bg-white p-6 rounded-xl w-full max-w-md">
    <h3 class="text-lg font-semibold mb-4">Generar Cuota Mensual</h3>
    <form id="formQuota" class="space-y-4">
      <div>
        <label for="quotaMonth" class="block text-sm font-medium text-gray-700">
          Mes de la cuota
        </label>
        <input
          id="quotaMonth"
          name="period"
          type="month"
          value="<?= date('Y-m') ?>"
          required
          class="w-full border rounded px-3 py-2"
        >
      </div>
      <div class="flex justify-end space-x-2 pt-4">
        <button type="button" id="closeQuota" class="px-4 py-2 rounded border">
          Cancelar
        </button>
        <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">
          Generar e Imprimir
        </button>
      </div>
    </form>
  </div>
</div>

<script>
const allProperties     = <?= json_encode($allProperties) ?>;
const allTenants        = <?= json_encode($allTenants) ?>;
const leasedPropertyIds = <?= json_encode(array_map('strval', $leasedPropertyIds)) ?>;

document.addEventListener('DOMContentLoaded', () => {
const modal            = document.getElementById('formModal');
const openBtn          = document.getElementById('openModalBtn');
const cancelBtn        = document.getElementById('cancelBtn');
const dataForm         = document.getElementById('dataForm');
const modalTitle       = document.getElementById('modalTitle');
const tableBody        = document.querySelector('#leases-table tbody');
const propertySelect   = document.getElementById('property_id');
const tenantSelect     = document.getElementById('tenant_id');
const rentInput        = document.getElementById('rent');
const updatePeriodInput= document.getElementById('update_period');
const increaseInput    = document.getElementById('increase_percent');
const increaseWrap     = document.getElementById('increase-wrapper');
let originalRent       = 0;

// Si falta algo, no arrancamos
if (!modal || !openBtn || !cancelBtn || !dataForm || !tableBody) return;

// Ahora sí abrimos/cerramos quitando/poniendo la clase hidden
const showModal = () => {
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
};
const hideModal = () => {
  modal.classList.add('hidden');
  modal.style.display = 'none';
};

// Populate helpers
const populateTenants = (selId='') => {
  tenantSelect.innerHTML = '<option value="">Seleccione un inquilino...</option>';
  allTenants.forEach(t => {
    tenantSelect.innerHTML += `<option value="${t.id}" ${t.id==selId?'selected':''}>${t.last_name}, ${t.first_name}</option>`;
  });
};
const populateProperties = (props, selId='') => {
  propertySelect.innerHTML = '<option value="">Seleccione una propiedad...</option>';
  props.forEach(p => {
    propertySelect.innerHTML += `<option value="${p.id}" ${p.id==selId?'selected':''}>${p.code} - ${p.address}</option>`;
  });
};

// — Nuevo Contrato —
openBtn.addEventListener('click', e => {
  e.preventDefault();
  dataForm.reset();
  document.getElementById('id').value = '';
  modalTitle.textContent = 'Crear Nuevo Contrato';

  // reset periodo
  if (updatePeriodInput) updatePeriodInput.value = 12;

  rentInput.readOnly = false;
  rentInput.classList.remove('bg-gray-100');
  increaseWrap.classList.add('hidden');

  const available = allProperties.filter(p => !leasedPropertyIds.includes(String(p.id)));
  populateProperties(available);
  populateTenants();

  showModal();
});

  // Editar
  tableBody.addEventListener('click', async e => {
    const btn = e.target.closest('.edit-btn');
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.id;
    const res = await fetch(`lease_get.php?id=${id}`);
    const data = await res.json();

    populateProperties(allProperties, data.property_id);
    populateTenants(data.tenant_id);
    for (let key in data) {
      if (dataForm.elements[key]) dataForm.elements[key].value = data[key];
    }
    originalRent = parseFloat(data.rent) || 0;
    increaseInput.value = '';
    rentInput.readOnly = true; rentInput.classList.add('bg-gray-100');
    increaseWrap.classList.remove('hidden');

    modalTitle.textContent = 'Editar Contrato';
    showModal();
  });

  increaseInput.addEventListener('input', () => {
    const pct = parseFloat(increaseInput.value)||0;
    rentInput.value = (originalRent*(1+pct/100)).toFixed(2);
  });

  cancelBtn.addEventListener('click', hideModal);

  dataForm.addEventListener('submit', async e => {
    e.preventDefault();
    await fetch('lease_save.php', {
      method:'POST',
      body:new FormData(dataForm)
    });
    location.reload();
  });
});

// --- AUMENTO MASIVO ---
const btnIncrease        = document.getElementById('btnIncrease');
const modalIncrease      = document.getElementById('modalIncrease');
const closeIncrease      = document.getElementById('closeIncrease');
const btnPreviewIncrease = document.getElementById('btnPreviewIncrease');
const formIncrease       = document.getElementById('formIncrease');
const previewTable       = document.getElementById('previewTable');
const btnApplyIncrease   = document.getElementById('btnApplyIncrease');

btnIncrease.onclick   = () => modalIncrease.classList.remove('hidden');
closeIncrease.onclick = () => modalIncrease.classList.add('hidden');

btnPreviewIncrease.onclick = async () => {
  const pct   = parseFloat(document.getElementById('increasePct').value);
  const group = document.getElementById('increaseGroup').value;
  if (isNaN(pct)) return alert('Ingrese un % válido');
  const res = await fetch('leases_preview_increase.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({percent:pct, update_period:group})
  });
  if (!res.ok) return alert('Error en preview');
  const data = await res.json();
  let html = `<table class="w-full text-sm"><thead><tr>
    <th class="px-2 py-1">Contrato</th>
    <th class="px-2 py-1">Actual</th>
    <th class="px-2 py-1">Nuevo</th>
  </tr></thead><tbody>`;
  data.forEach(r=>{
    html += `<tr>
      <td class="px-2 py-1">${r.lease_id}</td>
      <td class="px-2 py-1">$${parseFloat(r.old_rent).toFixed(2)}</td>
      <td class="px-2 py-1">$${parseFloat(r.new_rent).toFixed(2)}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  previewTable.innerHTML = html;
  btnApplyIncrease.disabled = false;
};

formIncrease.onsubmit = async e => {
  e.preventDefault();
  const pct   = parseFloat(document.getElementById('increasePct').value);
  const group = document.getElementById('increaseGroup').value;
  const res = await fetch('leases_apply_increase.php', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({percent:pct, update_period:group})
  });
  if (res.ok) {
    alert('Aumento aplicado');
    location.reload();
  } else alert('Error al aplicar aumento');
};

// ——— Modal Generar Cuota + Imprimir ———
const btnQuota     = document.getElementById('btnQuota');
const modalQuota   = document.getElementById('modalQuota');
const closeQuota   = document.getElementById('closeQuota');
const formQuota    = document.getElementById('formQuota');

btnQuota.onclick = () => {
  modalQuota.classList.remove('hidden');
};

closeQuota.onclick = () => {
  modalQuota.classList.add('hidden');
};

formQuota.addEventListener('submit', async e => {
  e.preventDefault();
  const period = document.getElementById('quotaMonth').value; // "YYYY-MM"

  // 1) Llamada a API para generar cuotas
  const res = await fetch('leases_generate_quota.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period })
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({ error:'desconocido' }));
    return alert('Error al generar cuotas: ' + (err.error || res.statusText));
  }

  // 2) Cerramos modal
  modalQuota.classList.add('hidden');

  // 3) Abrimos recibos e imprimimos
  const url = `receipt_template.php?period=${period}&autoPrint=1`;
  const w = window.open(url, '_blank');
  if (w) w.focus();
});

// ——— Botón “Generar Recibos” ———
document.getElementById('btnGenerateReceipts').addEventListener('click', () => {
  const period = new Date().toISOString().slice(0,7); // Mes actual
  window.open(`receipt_template.php?period=${period}&autoPrint=1`, '_blank');
});
</script>

<?php require_once 'includes/footer.php'; ?>
