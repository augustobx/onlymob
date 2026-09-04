<?php
// 1. Definimos las variables para el encabezado de página consistente.
$pageTitle = 'Propiedades';

// 2. Incluimos los headers.
require_once 'includes/header.php';
require_once 'includes/page_header.php';

// 1) Leer el parámetro de orden (asc o desc), por defecto asc
$dir     = (isset($_GET['dir']) && strtolower($_GET['dir']) === 'desc') ? 'DESC' : 'ASC';
$nextDir = $dir === 'ASC' ? 'desc' : 'asc';

// 2) Obtener propiedades, ordenadas numéricamente por código
$stmt = $pdo->prepare("
    SELECT 
        p.*, 
        CONCAT(t.first_name, ' ', t.last_name) AS tenant_name
    FROM properties p
    LEFT JOIN leases l 
      ON p.id = l.property_id AND l.status = 'current'
    LEFT JOIN tenants t 
      ON l.tenant_id = t.id
    ORDER BY CAST(p.code AS UNSIGNED) {$dir}
");
$stmt->execute();
$properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<div class="p-6 flex items-center space-x-4">
  <!-- Botón Nuevo -->
  <button id="openModalBtn" 
          class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
    + Nueva Propiedad
  </button>

  <!-- Botón de Ordenar -->
  <a href="?dir=<?= $nextDir ?>"
     class="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
    Ordenar Propiedad <?= $nextDir === 'asc' ? '↑' : '↓' ?>
  </a>
</div>

<div id="property-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
  <?php if (empty($properties)): ?>
    <p class="text-gray-500 md:col-span-full">
      No hay propiedades registradas.
    </p>
  <?php else: ?>
    <?php foreach ($properties as $property): ?>
      <div class="bg-white p-5 rounded-xl shadow-md flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-lg text-gray-800"><?= htmlspecialchars($property['code']) ?></h3>
            <span class="px-2 inline-flex text-xs font-semibold rounded-full 
              <?= !empty($property['tenant_name']) 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800' ?>">
              <?= !empty($property['tenant_name']) ? 'Alquilado' : 'Disponible' ?>
            </span>
          </div>
          <p class="text-sm text-gray-600 font-semibold"><?= htmlspecialchars($property['type']) ?></p>
          <p class="text-sm text-gray-600 mt-1"><?= htmlspecialchars($property['address']) ?></p>
          <?php if (!empty($property['tenant_name'])): ?>
            <p class="text-xs text-gray-500 mt-1">
              Inquilino: <?= htmlspecialchars($property['tenant_name']) ?>
            </p>
          <?php endif; ?>
        </div>
        <div class="text-right mt-4 border-t pt-4">
          <button type="button" 
                  class="font-medium text-indigo-600 hover:text-indigo-900 edit-btn" 
                  data-id="<?= $property['id'] ?>">
            Editar
          </button>
          <a href="property_delete.php?id=<?= $property['id'] ?>" 
             class="ml-4 font-medium text-red-600 hover:text-red-900"
             onclick="return confirm('¿Confirmas la eliminación de esta propiedad?');">
            Eliminar
          </a>
        </div>
      </div>
    <?php endforeach; ?>
  <?php endif; ?>
</div>

<div id="formModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 hidden items-center justify-center p-4" style="display: none; z-index: 100;">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg">
        <h2 id="modalTitle" class="text-2xl font-bold mb-6 text-gray-800"></h2>
        <form id="dataForm">
            <input type="hidden" name="id" id="id">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="code" id="code" placeholder="Código" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <select name="type" id="type" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                    <option value="" disabled selected>Selecciona un Tipo</option>
                    <option value="Departamento">Departamento</option>
                    <option value="Casa">Casa</option>
                    <option value="Local">Local</option>
                    <option value="Terreno">Terreno</option>
                </select>
                <div class="md:col-span-2">
                    <input type="text" name="address" id="address" placeholder="Dirección" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                </div>
                <input type="number" name="rooms" id="rooms" placeholder="Ambientes" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <input type="number" step="0.01" name="sqm" id="sqm" placeholder="Metros Cuadrados (m²)" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <input hidden type="number" step="0.01" name="price_rent" id="price_rent" placeholder="Precio Alquiler" value="0" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <input hidden type="number" step="0.01" name="expenses_share" id="expenses_share" placeholder="% Expensas" value="0" class="w-full px-3 py-2 border border-gray-300 rounded-md">
            </div>
            <div class="mt-6 flex justify-end gap-4">
                <button type="button" id="cancelBtn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400">Cancelar</button>
                <button type="submit" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">Guardar</button>
            </div>
        </form>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('formModal');
    const openBtn = document.getElementById('openModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const dataForm = document.getElementById('dataForm');
    const modalTitle = document.getElementById('modalTitle');
    const propertyList = document.getElementById('property-list');
    
    if (!modal || !openBtn || !cancelBtn || !dataForm || !propertyList) {
        console.error('Falta un elemento esencial del modal en el HTML.');
        return;
    }
    
    const showModal = () => { modal.style.display = 'flex'; };
    const hideModal = () => { modal.style.display = 'none'; };

    openBtn.addEventListener('click', e => {
        e.preventDefault();
        dataForm.reset();
        document.getElementById('id').value = '';
        document.getElementById('type').value = "";
        modalTitle.textContent = 'Crear Nueva Propiedad';
        showModal();
    });

    propertyList.addEventListener('click', async e => {
        const editBtn = e.target.closest('.edit-btn');
        if (!editBtn) return;
        
        const id = editBtn.dataset.id;
        try {
            const response = await fetch(`property_get.php?id=${id}`);
            if (!response.ok) throw new Error('No se pudo cargar la información.');
            const data = await response.json();

            for (const key in data) {
                if (dataForm.elements[key]) {
                    dataForm.elements[key].value = data[key];
                }
            }
            modalTitle.textContent = 'Editar Propiedad';
            showModal();
        } catch (error) {
            alert('No se pudieron cargar los datos de la propiedad.');
        }
    });

    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });

    dataForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const response = await fetch('property_save.php', { method: 'POST', body: new FormData(dataForm) });
            if (!response.ok) throw new Error('Error al guardar.');
            location.reload();
        } catch (error) {
            alert('No se pudo guardar la propiedad.');
        }
    });
});
</script>

<?php require_once 'includes/footer.php'; ?>