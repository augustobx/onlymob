<?php
// panel/property_view.php
require __DIR__ . '/includes/auth_check.php';
require_once 'includes/page_header.php';

$db = $pdo;

// Obtener ID de la propiedad
$propertyId = intval($_GET['id'] ?? 0);

// Consultar datos de la propiedad
$stmt = $db->prepare('SELECT * FROM properties WHERE id = ?');
$stmt->execute([$propertyId]);
$property = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$property) {
    header('Location: leases.php');
    exit;
}

// Consultar contrato activo
$stmt = $db->prepare("SELECT * FROM leases WHERE property_id = ? AND status = 'current' LIMIT 1");
$stmt->execute([$propertyId]);
$lease = $stmt->fetch(PDO::FETCH_ASSOC);
$leaseId = $lease['id'] ?? null;

// Consultar inquilino
$tenant = null;
if ($lease && isset($lease['tenant_id'])) {
    $stmt = $db->prepare('SELECT * FROM tenants WHERE id = ?');
    $stmt->execute([$lease['tenant_id']]);
    $tenant = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Consultar deudas pendientes
$pendingDebts = [];
if ($leaseId) {
    $stmt = $db->prepare(
        'SELECT d.id, d.type, d.description, d.amount, d.generated_at, d.due_date, d.paid_amount
         FROM debts d WHERE d.lease_id = ?'
    );
    $stmt->execute([$leaseId]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $d) {
        $rem = $d['amount'] - ($d['paid_amount'] ?? 0);
        if ($rem > 0) {
            $pendingDebts[] = $d;
        }
    }
}

// Consultar pagos realizados con método
$payments = [];
if ($leaseId) {
    $stmt = $db->prepare(
        'SELECT dp.id, d.type, d.description, dp.amount, dp.method, dp.paid_at
         FROM debt_payments dp
         JOIN debts d ON dp.debt_id = d.id
         WHERE d.lease_id = ?
         ORDER BY dp.paid_at DESC'
    );
    $stmt->execute([$leaseId]);
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Detalle de Propiedad</title>
</head>
<body class="bg-gray-100 min-h-screen">
  <?php include __DIR__ . '/includes/header.php'; ?>
  <main class="max-w-6xl mx-auto p-6 space-y-8">

    <!-- Tarjetas: Propiedad, Inquilino, Contrato -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Card Propiedad -->
      <div class="bg-white shadow-lg rounded-2xl p-6 transform hover:scale-105 transition">
        <h2 class="text-2xl font-bold mb-4 text-indigo-600">Propiedad</h2>
        <ul class="space-y-2 text-gray-700">
          <li><span class="font-semibold">Código:</span> <?= htmlspecialchars($property['code']) ?></li>
          <li><span class="font-semibold">Dirección:</span> <?= htmlspecialchars($property['address']) ?></li>
          <li><span class="font-semibold">Tipo:</span> <?= htmlspecialchars($property['type']) ?></li>
          <li><span class="font-semibold">Ambientes:</span> <?= htmlspecialchars($property['rooms']) ?></li>
          <li><span class="font-semibold">Superficie:</span> <?= htmlspecialchars($property['sqm']) ?> m²</li>
          <li><span class="font-semibold">Alquiler:</span> $<?= number_format($property['price_rent'],2) ?> / mes</li>
        </ul>
      </div>
      <!-- Card Inquilino -->
      <div class="bg-white shadow-lg rounded-2xl p-6 transform hover:scale-105 transition">
        <h2 class="text-2xl font-bold mb-4 text-green-600">Inquilino</h2>
        <?php if ($tenant): ?>
          <ul class="space-y-2 text-gray-700">
            <li><span class="font-semibold">Nombre:</span> <?= htmlspecialchars("{$tenant['first_name']} {$tenant['last_name']}") ?></li>
            <li><span class="font-semibold">DNI:</span> <?= htmlspecialchars($tenant['dni']) ?></li>
            <li><span class="font-semibold">Email:</span> <?= htmlspecialchars($tenant['email']) ?></li>
            <li><span class="font-semibold">Teléfono:</span> <?= htmlspecialchars($tenant['phone']) ?></li>
          </ul>
        <?php else: ?>
          <p class="text-gray-500">No hay inquilino asignado.</p>
        <?php endif; ?>
      </div>
      <!-- Card Contrato -->
<div class="bg-white shadow-lg rounded-2xl p-6 transform hover:scale-105 transition relative">
  <h2 class="text-2xl font-bold mb-4 text-yellow-600">Contrato</h2>
  <?php if ($leaseId): ?>
    <ul class="space-y-2 text-gray-700">
      <li><span class="font-semibold">Inicio:</span> <?= date('Y-m-d', strtotime($lease['start_date'])) ?></li>
      <li><span class="font-semibold">Fin:</span> <?= date('Y-m-d', strtotime($lease['end_date'])) ?></li>
      <li><span class="font-semibold">Alquiler:</span> $<?= number_format($lease['rent'],2) ?></li>
      <li><span class="font-semibold">Depósito:</span> $<?= number_format($lease['deposit'],2) ?></li>
    </ul>
    <button id="btnEditContract" class="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Editar</button>
  <?php else: ?>
    <div class="text-center py-4">
      <p class="text-gray-500">No hay contrato activo.</p>
    </div>
  <?php endif; ?>
</div>
    </div>


    <!-- Sección de Pendientes -->
    <section class="bg-white p-6 rounded-xl shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Pendientes</h2>
        <button id="btnNewDebt" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Generar Deuda</button>
      </div>
      <?php if (empty($pendingDebts)): ?>
        <p class="text-gray-500">No hay deudas pendientes.</p>
      <?php else: ?>
        <div id="debtList" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <?php foreach ($pendingDebts as $debt):
            $remaining = $debt['amount'] - ($debt['paid_amount'] ?? 0);
          ?>
          <div class="p-4 rounded-lg bg-amber-100" data-debt-id="<?= $debt['id'] ?>">
            <h4 class="font-semibold capitalize"><?= htmlspecialchars($debt['type']) ?>: <?= htmlspecialchars($debt['description']) ?></h4>
            <p class="text-sm">Generada: <?= date('Y-m-d', strtotime($debt['generated_at'])) ?></p>
            <p class="text-sm">Vence: <?= date('Y-m-d', strtotime($debt['due_date'])) ?></p>
            <p class="text-sm">Adeudado: $<?= number_format($remaining, 2) ?></p>
            <button class="mt-2 btnAddPayment bg-green-600 text-white text-sm px-3 py-1 rounded">+ Pago</button>
          </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </section>

<!-- Sección Pagos Realizados Plegable -->
<details class="bg-white rounded-xl shadow overflow-hidden mb-6">
  <summary 
    class="cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-gray-100"
  >
    <span class="text-xl font-semibold">Pagos Realizados</span>
    <svg class="w-5 h-5 transform transition-transform rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </summary>
  <div class="px-6 py-4 border-t">
    <?php if (empty($payments)): ?>
      <p class="text-gray-500">Aún no se ha registrado ningún pago.</p>
    <?php else: ?>
      <div class="overflow-x-auto">
        <table class="min-w-full bg-green-50 rounded-lg">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left">Tipo</th>
              <th class="px-4 py-2 text-left">Descripción</th>
              <th class="px-4 py-2 text-left">Monto</th>
              <th class="px-4 py-2 text-left">Método</th>
              <th class="px-4 py-2 text-left">Fecha Pago</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach ($payments as $p): ?>
              <tr class="border-t">
                <td class="px-4 py-2 capitalize"><?= htmlspecialchars($p['type']) ?></td>
                <td class="px-4 py-2"><?= htmlspecialchars($p['description']) ?></td>
                <td class="px-4 py-2">$<?= number_format($p['amount'], 2) ?></td>
                <td class="px-4 py-2 capitalize"><?= htmlspecialchars($p['method']) ?></td>
                <td class="px-4 py-2"><?= date('Y-m-d', strtotime($p['paid_at'])) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    <?php endif; ?>
  </div>
</details>

 <!-- Sección Documentos Plegable -->
<details class="bg-white rounded-xl shadow overflow-hidden">
  <summary 
    class="cursor-pointer px-6 py-4 flex justify-between items-center hover:bg-gray-100"
  >
    <span class="text-xl font-semibold">Documentos</span>
    <svg class="w-5 h-5 transform transition-transform rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </summary>
  <div class="px-6 py-4 border-t space-y-4">
    <form 
      id="formUpload" 
      action="property_docs_upload.php" 
      method="post" 
      enctype="multipart/form-data" 
      class="space-y-4"
    >
      <input type="hidden" name="tenant_dni" value="<?= htmlspecialchars($tenant['dni'] ?? '') ?>">
      <input type="hidden" name="property_id" value="<?= $propertyId ?>">

      <div>
        <label class="block font-medium mb-1">DNI Frontal (PDF/JPG/PNG)</label>
        <input type="file" name="dni_front" accept=".pdf,image/*" required>
      </div>
      <div>
        <label class="block font-medium mb-1">DNI Dorso (PDF/JPG/PNG)</label>
        <input type="file" name="dni_back" accept=".pdf,image/*" required>
      </div>
      <div>
        <label class="block font-medium mb-1">Recibos de Sueldo (varios)</label>
        <input type="file" name="paystubs[]" accept=".pdf,image/*" multiple>
      </div>
      <div>
        <label class="block font-medium mb-1">Recibos de Sueldo Garantes (varios)</label>
        <input type="file" name="guarantor_paystubs[]" accept=".pdf,image/*" multiple>
      </div>
      <div class="flex justify-end">
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg">Subir Documentos</button>
      </div>
    </form>

    <div>
      <h3 class="font-semibold mb-2">Archivos Cargados</h3>
      <ul class="list-disc list-inside text-blue-600">
        <?php
        $dni = $tenant['dni'] ?? null;
        if ($dni) {
          $base = __DIR__ . '/uploads/' . preg_replace('/\D/','',$dni) . '/';
          if (is_dir($base)) {
            foreach (new DirectoryIterator($base) as $f) {
              if ($f->isFile()) {
                $name = htmlspecialchars($f->getFilename());
                echo "<li><a href=\"uploads/{$dni}/{$name}\" target=\"_blank\">{$name}</a></li>";
              }
            }
          }
        }
        ?>
      </ul>
    </div>
  </div>
</details>



    <!-- Modales -->
    <div id="modalDebt" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Generar Nueva Deuda</h3>
        <form id="formDebt">
          <div class="mb-3">
            <label class="block text-sm">Tipo</label>
            <select name="type" class="w-full border rounded px-3 py-2">
              <option value="alquiler">Alquiler</option>
              <option value="deposito">Depósito</option>
              <option value="luz">Luz</option>
              <option value="gas">Gas</option>
              <option value="agua">Agua</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="block text-sm">Descripción</label>
            <input name="description" type="text" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3 grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm">Monto</label>
              <input name="amount" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm">Fecha Vencimiento</label>
              <input name="due_date" type="date" class="w-full border rounded px-3 py-2" required>
            </div>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="closeDebtModal" class="px-4 py-2 rounded border">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded">Crear</button>
          </div>
        </form>
      </div>
    </div>
    <div id="modalPay" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Registrar Pago</h3>
        <form id="formPay">
          <input type="hidden" name="debt_id">
          <div class="mb-3">
            <p class="text-sm">Monto Adeudado: <span id="payRemaining"></span></p>
          </div>
          <div class="mb-3">
            <label class="block text-sm">Monto a Pagar</label>
            <input id="inputPayAmount" name="amount" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3">
            <label class="block text-sm">Método de Pago</label>
            <select name="method" class="w-full border rounded px-3 py-2" required>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" id="closePayModal" class="px-4 py-2 rounded border">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Registrar</button>
          </div>
        </form>
      </div>
    </div>


<!-- Modal Editar Contrato -->
<div id="modalContract" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
  <div class="bg-white rounded-xl p-6 w-full max-w-md">
    <h3 class="text-lg font-semibold mb-4">Editar Contrato</h3>
    <form id="formContract">
        <input type="hidden" name="id"          value="<?= $leaseId      ?>">
        <input type="hidden" name="property_id" value="<?= $propertyId   ?>">
        <input type="hidden" name="tenant_id"   value="<?= $lease['tenant_id'] ?? '' ?>">
      <div class="mb-3">
        <label class="block text-sm">Fecha Inicio</label>
        <input name="start_date" type="date" class="w-full border rounded px-3 py-2" required>
      </div>
      <div class="mb-3">
        <label class="block text-sm">Fecha Fin</label>
        <input name="end_date" type="date" class="w-full border rounded px-3 py-2" required>
      </div>
      <div class="mb-3">
        <label class="block text-sm">Alquiler Actual</label>
        <input id="rentInput" type="number" step="0.01" class="w-full border rounded px-3 py-2" readonly>
      </div>
      <div class="mb-3">
        <label class="block text-sm">% Aumento</label>
        <input id="increaseInput" type="number" step="0.01" class="w-full border rounded px-3 py-2">
      </div>
      <div class="mb-3">
        <label class="block text-sm">Depósito</label>
        <input name="deposit" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
      </div>
      <div class="flex justify-end space-x-2">
        <button type="button" id="closeContractModal" class="px-4 py-2 rounded border">Cancelar</button>
        <button type="submit" class="px-4 py-2 bg-yellow-500 text-white rounded">Guardar</button>
      </div>
    </form>
  </div>
</div>





  </main>
  <?php include __DIR__ . '/includes/footer.php'; ?>
  <script>
 let originalRent = 0;
  const btnEdit       = document.getElementById('btnEditContract');
  const modalContract = document.getElementById('modalContract');
  const closeContract = document.getElementById('closeContractModal');
  const rentInput     = document.getElementById('rentInput');
  const increaseInput = document.getElementById('increaseInput');

  // Abrir modal y cargar datos
  btnEdit.addEventListener('click', async () => {
    const res  = await fetch(`lease_get.php?id=<?= $leaseId ?>`);
    const data = await res.json();
    originalRent = parseFloat(data.rent) || 0;

    // Prefill form
    document.querySelector('#formContract [name=start_date]').value = data.start_date;
    document.querySelector('#formContract [name=end_date]').value   = data.end_date;
    rentInput.value     = originalRent.toFixed(2);
    increaseInput.value = '';
    document.querySelector('#formContract [name=deposit]').value = data.deposit;

    modalContract.classList.remove('hidden');
  });

  // Cerrar modal
  closeContract.addEventListener('click', () => {
    modalContract.classList.add('hidden');
  });

  // Recalcular alquiler compuesto al tipear %
  increaseInput.addEventListener('input', () => {
    const pct = parseFloat(increaseInput.value) || 0;
    rentInput.value = (originalRent * (1 + pct/100)).toFixed(2);
  });

  // Enviar formulario de contrato
  document.getElementById('formContract').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    data.set('rent', rentInput.value);

    const res = await fetch('lease_save.php', { method: 'POST', body: data });
    if (res.ok) {
      alert('Contrato actualizado');
      location.reload();
    } else {
      alert('Error al guardar contrato');
    }
  });


    let currentRemaining = 0;
    const modalDebt = document.getElementById('modalDebt');
    const modalPay = document.getElementById('modalPay');
    document.getElementById('btnNewDebt').onclick = () => modalDebt.classList.remove('hidden');
    document.getElementById('closeDebtModal').onclick = () => modalDebt.classList.add('hidden');
    document.getElementById('closePayModal').onclick = () => modalPay.classList.add('hidden');

    document.getElementById('formDebt').onsubmit = async e => {
      e.preventDefault();
      const form = e.target;
      const data = new FormData(form);
      data.append('lease_id', <?= json_encode($leaseId) ?>);
      const res = await fetch('api/debts.php', { method: 'POST', body: data });
      if (res.ok) location.reload(); else alert('Error al generar deuda');
    };

    document.querySelectorAll('.btnAddPayment').forEach(btn => {
      btn.onclick = () => {
        const card = btn.closest('[data-debt-id]');
        const debtId = card.dataset.debtId;
        const remText = card.querySelector('p:nth-of-type(3)').textContent;
        const rem = parseFloat(remText.replace(/[^0-9\.]/g, ''));
        currentRemaining = rem;
        document.querySelector('#formPay [name=debt_id]').value = debtId;
        document.getElementById('payRemaining').textContent = `$${rem.toFixed(2)}`;
        const input = document.getElementById('inputPayAmount');
        input.value = '';
        input.setAttribute('max', rem);
        input.placeholder = rem.toFixed(2);
        modalPay.classList.remove('hidden');
      };
    });

    document.getElementById('formPay').onsubmit = async e => {
      e.preventDefault();
      const input = document.getElementById('inputPayAmount');
      const val = parseFloat(input.value);
      if (val > currentRemaining) {
        alert(`El monto no puede superar el adeudado ($${currentRemaining.toFixed(2)})`);
        return;
      }
      const form = e.target;
      const data = new FormData(form);
      const res = await fetch('api/payments.php', { method: 'POST', body: data });
      if (res.ok) location.reload(); else alert('Error al registrar pago');
    };
  </script>
</body>
</html>