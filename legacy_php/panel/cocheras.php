<?php
// panel/cocheras.php
$pageTitle = 'Cocheras';
require __DIR__ . '/includes/auth_check.php';
require_once 'includes/header.php';
require_once 'includes/page_header.php';
// 1) Traer todas las cocheras con conteo de espacios
$stmt = $pdo->query("
  SELECT 
    g.id,
    g.address,
    g.total_spaces,
    SUM(gs.status = 'occupied') AS occupied,
    SUM(gs.status = 'free')     AS free
  FROM garages g
  LEFT JOIN garage_spaces gs ON gs.garage_id = g.id
  GROUP BY g.id
  ORDER BY g.address
");
$garages = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Cocheras</title>
</head>

<div class="p-6">
    <!-- Botón Nueva Cochera -->
    <button id="btnNewGarage"class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded">+ Nueva Cochera</button>

    <!-- Listado de Cocheras -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      <?php foreach($garages as $g): ?>
        <div class="bg-white p-4 rounded-xl shadow">
          <h2 class="font-semibold text-xl mb-2"><?= htmlspecialchars($g['address']) ?></h2>
          <p>Espacios: <?= $g['occupied'] ?> ocupados / <?= $g['free'] ?> libres</p>
          <div class="mt-3 flex space-x-2">
            <button 
              data-garage-id="<?= $g['id'] ?>"
              class="btnViewSpaces bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >Ver Espacios</button>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <!-- Modal Nueva Cochera -->
    <div id="modalGarage" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-40">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-lg font-semibold mb-4">Agregar Nueva Cochera</h3>
        <form id="formGarage" class="space-y-4">
          <div>
            <label class="block text-sm font-medium">Dirección</label>
            <input name="address" type="text" class="w-full border rounded px-3 py-2" required>
          </div>
          <div>
            <label class="block text-sm font-medium">Total de espacios</label>
            <input name="total_spaces" type="number" min="1" class="w-full border rounded px-3 py-2" required>
          </div>
          <div class="flex justify-end space-x-2 mt-4">
            <button type="button" id="closeGarageModal" class="px-4 py-2 border rounded">Cancelar</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded">Crear</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Espacios de Cochera -->
    <div id="modalSpaces" class="fixed inset-0 flex items-start justify-center pt-20 bg-black bg-opacity-50 hidden z-40">
      <div class="bg-white rounded-xl p-6 w-full max-w-lg overflow-auto max-h-[80vh] relative">
        <h3 class="text-lg font-semibold mb-4">Espacios</h3>
        <div id="spacesList" class="grid grid-cols-2 gap-4"></div>
        <div class="mt-4 text-right">
          <button id="closeSpacesModal" class="px-4 py-2 border rounded">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo Contrato Cochera -->
    <div id="modalLease" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 hidden z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4 overflow-auto max-h-[80vh] relative">
        <button
          id="closeLeaseModal"
          class="absolute top-3 right-3 text-gray-600 hover:text-gray-800 text-2xl leading-none"
        >&times;</button>
        <div id="leaseFormContainer"></div>
      </div>
    </div>

  </main>

  <?php include __DIR__ . '/includes/footer.php'; ?>

  <script>
    // Referencias
    const btnNewGarage      = document.getElementById('btnNewGarage');
    const modalGarage       = document.getElementById('modalGarage');
    const closeGarageModal  = document.getElementById('closeGarageModal');
    const formGarage        = document.getElementById('formGarage');

    const modalSpaces       = document.getElementById('modalSpaces');
    const spacesList        = document.getElementById('spacesList');
    const closeSpacesModal  = document.getElementById('closeSpacesModal');

    const modalLease        = document.getElementById('modalLease');
    const closeLeaseModal   = document.getElementById('closeLeaseModal');
    let currentGarageId     = null;

    // 1) Nuevo Garage
    btnNewGarage.onclick = () => modalGarage.classList.remove('hidden');
    closeGarageModal.onclick = () => modalGarage.classList.add('hidden');
    formGarage.onsubmit = async e => {
      e.preventDefault();
      const res = await fetch('api/garages_create.php', {
        method: 'POST',
        body: new FormData(formGarage)
      });
      if (res.ok) location.reload();
      else alert('Error al crear cochera');
    };

    // 2) Ver Espacios
    document.querySelectorAll('.btnViewSpaces').forEach(btn => {
      btn.onclick = async () => {
        currentGarageId = btn.dataset.garageId;
        const res = await fetch(`garage_spaces.php?garage_id=${currentGarageId}`);
        spacesList.innerHTML = await res.text();
        bindNewLeaseButtons();
        modalSpaces.classList.remove('hidden');
      };
    });
    closeSpacesModal.onclick = () => modalSpaces.classList.add('hidden');

    // 3) Cargar y bindear form de nuevo contrato en modal
    async function loadLeaseForm(spaceId) {
      const res  = await fetch(`api/garage_lease_form.php?space_id=${spaceId}`);
      const html = await res.text();
      document.getElementById('leaseFormContainer').innerHTML = html;

      // Cancelar
      document.getElementById('cancelLease').onclick = () => {
        modalLease.classList.add('hidden');
      };
      // Enviar contrato
      document.getElementById('formGarageLease').onsubmit = async e => {
        e.preventDefault();
        const form = e.target;
        const r   = await fetch('api/garage_leases_create.php', {
          method: 'POST',
          body: new FormData(form)
        });
        if (r.ok) {
          modalLease.classList.add('hidden');
          // refresca espacios
          document.querySelector(`.btnViewSpaces[data-garage-id="${currentGarageId}"]`).click();
        } else {
          alert('Error al guardar contrato');
        }
      };
    }

    // 4) Bind botones +Contrato dentro de spacesList
    function bindNewLeaseButtons() {
      spacesList.querySelectorAll('.btnNewLease').forEach(btn => {
        btn.onclick = () => {
          loadLeaseForm(btn.dataset.spaceId);
          modalLease.classList.remove('hidden');
        };
      });
    }

    // 5) Cerrar modal lease
    closeLeaseModal.onclick = () => modalLease.classList.add('hidden');
  </script>
</body>
</html>
