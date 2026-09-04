<?php
$pageTitle = 'Inquilinos'; // 1. Título
$headerButton = '<button id="openModalBtn" class="...">+ Nuevo Inquilino</button>'; // El botón se mantiene
require_once 'includes/header.php';   // 2. Menú lateral
require_once 'includes/page_header.php'; // 3. Barra de título superior (idéntica a la del dashboard)

// 3. Lógica PHP para obtener todos los inquilinos
$stmt = $pdo->query('SELECT id, first_name, last_name, dni, email, phone, status FROM tenants ORDER BY last_name, first_name');
$tenants = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>



<div class="p-6">
    <button id="openModalBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 shadow-sm">+ Nuevo Inquilino</button>
    <div id="tenant-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <?php foreach ($tenants as $tenant): ?>
            <div class="bg-white p-5 rounded-xl shadow-md flex flex-col justify-between">
                <div>
                    <h3 class="font-bold text-lg text-gray-800"><?= htmlspecialchars($tenant['first_name'] . ' ' . $tenant['last_name']) ?></h3>
                    <p class="text-sm text-gray-600 mt-1">DNI: <?= htmlspecialchars($tenant['dni']) ?></p>
                    <p class="text-sm text-gray-600 mt-2">Email: <?= htmlspecialchars($tenant['email']) ?></p>
                </div>
                <div class="text-right mt-4 border-t pt-4">
                    <button type="button" class="font-medium text-indigo-600 hover:text-indigo-900 edit-btn" data-id="<?= $tenant['id'] ?>">Editar</button>
                    <a href="tenant_delete.php?id=<?= $tenant['id'] ?>" class="ml-4 font-medium text-red-600 hover:text-red-900" onclick="return confirm('¿Confirmas la eliminación de este inquilino?');">Eliminar</a>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<div id="formModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 hidden items-center justify-center p-4" style="display: none; z-index: 100;">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 id="modalTitle" class="text-2xl font-bold mb-6"></h2>
        <form id="dataForm">
            <input type="hidden" name="id" id="id">
            <div class="space-y-4">
                <input type="text" name="first_name" id="first_name" placeholder="Nombre" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <input type="text" name="last_name" id="last_name" placeholder="Apellido" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <input type="text" name="dni" id="dni" placeholder="DNI" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <input type="email" name="email" id="email" placeholder="Email" class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                <input type="text" name="phone" id="phone" placeholder="Teléfono" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                <select name="status" id="status" class="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                </select>
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
    const tenantList = document.getElementById('tenant-list');
    
    // Funciones para mostrar/ocultar el modal
    const showModal = () => { modal.style.display = 'flex'; };
    const hideModal = () => { modal.style.display = 'none'; };

    // Abrir modal para CREAR un nuevo inquilino
    openBtn.addEventListener('click', e => {
        e.preventDefault();
        dataForm.reset();
        document.getElementById('id').value = ''; // Limpiar el ID oculto
        modalTitle.textContent = 'Crear Nuevo Inquilino';
        showModal();
    });

    // Abrir modal para EDITAR (usando delegación de eventos)
    tenantList.addEventListener('click', async e => {
        if (e.target && e.target.classList.contains('edit-btn')) {
            const id = e.target.dataset.id;
            try {
                const response = await fetch(`tenant_get.php?id=${id}`);
                if (!response.ok) throw new Error('No se pudo cargar la información del inquilino.');
                const data = await response.json();

                // Llenar el formulario del modal con los datos obtenidos
                for (const key in data) {
                    if (dataForm.elements[key]) {
                        dataForm.elements[key].value = data[key];
                    }
                }
                modalTitle.textContent = 'Editar Inquilino';
                showModal();
            } catch (error) {
                console.error('Error:', error);
                alert(error.message);
            }
        }
    });

    // Cerrar el modal con el botón de cancelar o click fuera del contenido
    cancelBtn.addEventListener('click', hideModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            hideModal();
        }
    });

    // Guardar los datos del formulario (Crear o Editar)
    dataForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
            const response = await fetch('tenant_save.php', {
                method: 'POST',
                body: new FormData(dataForm)
            });
            if (!response.ok) throw new Error('Hubo un error al guardar los datos.');
            location.reload(); // Recarga la página para mostrar los cambios
        } catch (error) {
            console.error('Error al guardar:', error);
            alert(error.message);
        }
    });
});
</script>

<?php require_once 'includes/footer.php'; ?>