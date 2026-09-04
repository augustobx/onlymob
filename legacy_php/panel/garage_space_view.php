<?php
// panel/garage_space_view.php

require __DIR__ . '/includes/auth_check.php';
$db = $pdo;


// 1. Definimos las variables para el encabezado de página.
$pageTitle = 'Informacion Contrato Cochera';

// 2. Incluimos los headers.
require_once 'includes/header.php';
require_once 'includes/page_header.php';

// 1) Recoger lease_id
$leaseId = intval($_GET['lease_id'] ?? 0);
if ($leaseId < 1) {
    header('Location: leases_cocheras.php');
    exit;
}

// 2) Cargar datos del contrato + cochera
$stmt = $db->prepare("
  SELECT 
    gl.*,
    CONCAT(t.first_name,' ',t.last_name) AS tenant_name,
    t.dni, t.email, t.phone,
    g.address AS garage_address
  FROM garage_leases gl
  JOIN tenants t ON t.id = gl.tenant_id
  JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
  JOIN garage_spaces gs       ON gs.id        = gls.space_id
  JOIN garages g              ON g.id         = gs.garage_id
  WHERE gl.id = ?
  LIMIT 1
");
$stmt->execute([$leaseId]);
$lease = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$lease) {
    header('Location: leases_cocheras.php');
    exit;
}

// 3) Cargar lista de plazas
$stmt = $db->prepare("
  SELECT gs.space_number
  FROM garage_lease_spaces gls
  JOIN garage_spaces gs ON gs.id = gls.space_id
  WHERE gls.lease_id = ?
  ORDER BY CAST(gs.space_number AS UNSIGNED)
");
$stmt->execute([$leaseId]);
$spaces = $stmt->fetchAll(PDO::FETCH_COLUMN);

// 4) Deudas pendientes y pagadas
$pendingDebts = $paidDebts = [];
$stmt = $db->prepare("
  SELECT id,type,description,amount,generated_at,due_date,paid_amount
  FROM garage_debts
  WHERE garage_lease_id = ?
");
$stmt->execute([$leaseId]);
foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $d) {
    $rem = $d['amount'] - ($d['paid_amount'] ?? 0);
    if ($rem > 0) $pendingDebts[] = $d; else $paidDebts[] = $d;
}

// 5) Pagos realizados
$payments = [];
$stmt = $db->prepare("
  SELECT gp.id, gd.type, gd.description, gp.amount, gp.method, gp.paid_at
  FROM garage_payments gp
  JOIN garage_debts gd ON gd.id = gp.debt_id
  WHERE gd.garage_lease_id = ?
  ORDER BY gp.paid_at DESC
");
$stmt->execute([$leaseId]);
$payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Detalle Contrato Cochera</title>
</head>
<body class="bg-gray-100 min-h-screen">
  <?php include __DIR__ . '/includes/header.php'; ?>
  <main class="max-w-6xl mx-auto p-6 space-y-8">
    <!-- Tarjeta Contrato Cochera -->
    <div class="bg-white shadow-lg rounded-2xl p-6 relative">
      <h2 class="text-2xl font-bold mb-4 text-yellow-600">Contrato Cochera</h2>
      <ul class="space-y-2 text-gray-700">
        <li><span class="font-semibold">Cochera:</span> <?= htmlspecialchars($lease['garage_address']) ?></li>
        <li><span class="font-semibold">Plazas:</span> <?= htmlspecialchars(implode(', ', $spaces)) ?></li>
        <li><span class="font-semibold">Inquilino:</span> <?= htmlspecialchars($lease['tenant_name']) ?></li>
        <li><span class="font-semibold">DNI:</span> <?= htmlspecialchars($lease['dni']) ?></li>
        <li><span class="font-semibold">Email:</span> <?= htmlspecialchars($lease['email']) ?></li>
        <li><span class="font-semibold">Teléfono:</span> <?= htmlspecialchars($lease['phone']) ?></li>
        <li><span class="font-semibold">Inicio:</span> <?= date('Y-m-d', strtotime($lease['start_date'])) ?></li>
        <li><span class="font-semibold">Fin:</span> <?= date('Y-m-d', strtotime($lease['end_date'])) ?></li>
        <li><span class="font-semibold">Alquiler:</span> $<?= number_format($lease['rent'],2) ?></li>
        <li><span class="font-semibold">Depósito:</span> $<?= number_format($lease['deposit'],2) ?></li>
        <li><span class="font-semibold">Ajuste %:</span> <?= htmlspecialchars($lease['increase_percent']) ?>%</li>
      </ul>
      <button id="btnEditLease" class="absolute top-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
        Editar
      </button>
    </div>

    <!-- Sección de Deudas Pendientes -->
    <section class="bg-white p-6 rounded-xl shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Deudas Pendientes</h2>
        <button id="btnNewDebt" class="bg-indigo-600 text-white px-4 py-2 rounded-lg">Generar Deuda</button>
      </div>
      <?php if (empty($pendingDebts)): ?>
        <p class="text-gray-500">No hay deudas pendientes.</p>
      <?php else: ?>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <?php foreach ($pendingDebts as $d):
            $rem = $d['amount'] - ($d['paid_amount'] ?? 0);
          ?>
          <div class="p-4 rounded-lg bg-amber-100" data-debt-id="<?= $d['id'] ?>">
            <h4 class="font-semibold capitalize"><?= htmlspecialchars($d['type']) ?>: <?= htmlspecialchars($d['description']) ?></h4>
            <p class="text-sm">Generada: <?= date('Y-m-d', strtotime($d['generated_at'])) ?></p>
            <p class="text-sm">Vence: <?= date('Y-m-d', strtotime($d['due_date'])) ?></p>
            <p class="text-sm">Adeudado: $<?= number_format($rem,2) ?></p>
            <button class="mt-2 btnAddPayment bg-green-600 text-white text-sm px-3 py-1 rounded">+ Pago</button>
          </div>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </section>

    <!-- Sección de Pagos Realizados -->
    <section class="bg-white p-6 rounded-xl shadow">
      <h2 class="text-xl font-semibold mb-4">Pagos Realizados</h2>
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
                <td class="px-4 py-2"><?= htmlspecialchars($p['method']) ?></td>
                <td class="px-4 py-2"><?= date('Y-m-d', strtotime($p['paid_at'])) ?></td>
              </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </section>

    <!-- Modales: Editar Contrato -->
    <div id="modalContract" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <button data-close="modalContract" class="absolute top-2 right-2 text-xl">×</button>
        <h3 class="text-lg font-semibold mb-4">Editar Contrato</h3>
        <form id="formContract">
          <input type="hidden" name="lease_id" value="<?= $leaseId ?>">
          <div class="mb-3"><label class="block text-sm">Fecha Inicio</label>
            <input name="start_date" type="date" value="<?= date('Y-m-d',strtotime($lease['start_date'])) ?>" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3"><label class="block text-sm">Fecha Fin</label>
            <input name="end_date" type="date" value="<?= date('Y-m-d',strtotime($lease['end_date'])) ?>" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3"><label class="block text-sm">Alquiler</label>
            <input name="rent" type="number" step="0.01" value="<?= $lease['rent'] ?>" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3"><label class="block text-sm">Depósito</label>
            <input name="deposit" type="number" step="0.01" value="<?= $lease['deposit'] ?>" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3"><label class="block text-sm">Ajuste %</label>
            <input name="increase_percent" type="number" step="0.01" value="<?= $lease['increase_percent'] ?>" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" data-close="modalContract" class="px-4 py-2 rounded border">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-yellow-500 text-white rounded">Guardar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modales: Generar Deuda -->
    <div id="modalDebt" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
         <button data-close="modalDebt" class="absolute top-2 right-2 text-xl">×</button>
        <h3 class="text-lg font-semibold mb-4">Generar Nueva Deuda</h3>
        <form id="formDebt">
          <div class="mb-3"><label class="block text-sm">Tipo</label>
            <select name="type" class="w-full border rounded px-3 py-2">
              <option value="alquiler">Alquiler</option>
              <option value="deposito">Depósito</option>
              <option value="otros">Otros</option>
            </select>
          </div>
          <div class="mb-3"><label class="block text-sm">Descripción</label>
            <input name="description" type="text" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3 grid grid-cols-2 gap-4">
            <div><label class="block text-sm">Monto</label>
              <input name="amount" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
            </div>
            <div><label class="block text-sm">Fecha Vencimiento</label>
              <input name="due_date" type="date" class="w-full border rounded px-3 py-2" required>
            </div>
          </div>
          <div class="flex justify-end space-x-2">
            <button type="button" data-close="modalDebt" class="px-4 py-2 rounded border">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded">Crear</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modales: Registrar Pago -->
    <div id="modalPay" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <button id="closePayModal" class="absolute top-2 right-2 text-gray-500">×</button>
        <h3 class="text-lg font-semibold mb-4">Registrar Pago</h3>
        <form id="formPay">
          <input type="hidden" name="debt_id">
          <div class="mb-3"><p class="text-sm">Monto Adeudado: <span id="payRemaining"></span></p></div>
          <div class="mb-3"><label class="block text-sm">Monto a Pagar</label>
            <input id="inputPayAmount" name="amount" type="number" step="0.01" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="mb-3"><label class="block text-sm">Método de Pago</label>
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
  </main>
  <?php include __DIR__ . '/includes/footer.php'; ?>

  <!-- SCRIPT CORREGIDO -->
  <script>
 document.addEventListener('DOMContentLoaded', () => {
      // referencias a los tres modales
      const modalC = document.getElementById('modalContract');
      const modalD = document.getElementById('modalDebt');
      const modalP = document.getElementById('modalPay');

      // abrir
      document.getElementById('btnEditLease').onclick = () => modalC.classList.remove('hidden');
      document.getElementById('btnNewDebt').onclick  = () => modalD.classList.remove('hidden');

      // cerrar: enganchar **TODOS** los botones con data-close="X"
      document.querySelectorAll('[data-close]').forEach(btn => {
        const target = btn.getAttribute('data-close');
        btn.onclick = () => document.getElementById(target).classList.add('hidden');
      });

      // --- EDITAR CONTRATO ---
      const formC = document.getElementById('formContract');
      formC.onsubmit = async e => {
        e.preventDefault();
        const res = await fetch('api/garage_leases_update.php', {
          method: 'POST',
          body: new FormData(formC)
        });
        if (res.ok) location.reload();
        else {
          const err = await res.json().catch(()=>null);
          alert('Error al guardar contrato: '+(err?.error||res.statusText));
        }
      };

      // --- GENERAR DEUDA ---
      const formD = document.getElementById('formDebt');
      formD.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(formD);
        fd.append('lease_id', <?= $leaseId ?>);
        const res = await fetch('api/garage_debts.php', {
          method:'POST',
          body: fd
        });
        if (res.ok) location.reload();
        else alert('Error al generar deuda');
      };

      // --- REGISTRAR PAGO ---
      let currentRemain = 0;
      document.querySelectorAll('.btnAddPayment').forEach(btn => {
        btn.onclick = () => {
          const card = btn.closest('[data-debt-id]');
          currentRemain = parseFloat(
            card.querySelector('.text-sm:nth-of-type(3)').textContent.replace(/[^0-9.]/g,'')
          );
          document.querySelector('#formPay [name=debt_id]').value = card.dataset.debtId;
          document.getElementById('payRemaining').textContent = `$${currentRemain.toFixed(2)}`;
          const inp = document.getElementById('inputPayAmount');
          inp.value = ''; inp.max = currentRemain; inp.placeholder = currentRemain.toFixed(2);
          modalP.classList.remove('hidden');
        };
      });

      const formP = document.getElementById('formPay');
      formP.onsubmit = async e => {
        e.preventDefault();
        const val = parseFloat(document.getElementById('inputPayAmount').value);
        if (val > currentRemain) {
          alert(`El monto no puede superar $${currentRemain.toFixed(2)}`); 
          return;
        }
        const res = await fetch('api/garage_payments.php', {
          method:'POST',
          body:new FormData(formP)
        });
        if (res.ok) location.reload();
        else alert('Error al registrar pago');
      };
    });
  </script>
</body>
</html>
