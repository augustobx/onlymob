// --- Helper: formatea fecha YYYY-MM-DD → DD/MM/YYYY
function fmtDate(d){ const [y,m,day]=d.split('-');return `${day}/${m}/${y}`; }

const token = localStorage.getItem('jwt');
if (!token) location.href = 'login.html';

// Logout
document.getElementById('btnLogout').onclick = () => {
  localStorage.removeItem('jwt');
  location.href = 'login.html';
};

// Carga datos: contrato, deudas, historial
(async()=>{
  const res = await fetch('/panel/api/tenant_dashboard.php', {
    headers: { 'Authorization': 'Bearer '+token }
  });
  if (!res.ok) return alert('Error al cargar datos');
  const { contract, debts, payments } = await res.json();

  const cards = document.getElementById('cards');

  // Contrato
  cards.innerHTML += `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Contrato Vigente</h2>
      <p><strong>Propiedad:</strong> ${contract.property_code}</p>
      <p><strong>Dirección:</strong> ${contract.address}</p>
      <p><strong>Periodo:</strong> ${fmtDate(contract.start_date)} – ${fmtDate(contract.end_date)}</p>
      <p><strong>Alquiler:</strong> $${parseFloat(contract.rent).toFixed(2)}</p>
      <p><strong>Actualización cada:</strong> ${contract.update_period} mes(es)</p>
    </div>`;

  // Deudas pendientes
  cards.innerHTML += `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Deudas Pendientes</h2>
      ${debts.length
        ? debts.map(d=>`
            <div class="mb-3 border-l-4 border-red-500 pl-3">
              <p><strong>${d.description}</strong></p>
              <p>Generada: ${fmtDate(d.generated_at)}</p>
              <p>Vence: ${fmtDate(d.due_date)}</p>
              <p class="text-red-600 font-bold">$${parseFloat(d.amount_due).toFixed(2)}</p>
            </div>
          `).join('')
        : '<p class="text-green-600">No tienes deudas pendientes.</p>'}
    </div>`;

  // Historial de pagos
  cards.innerHTML += `
    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold mb-4">Historial de Pagos</h2>
      ${payments.length
        ? `<table class="w-full text-sm text-left">
            <thead><tr>
              <th class="py-1">Fecha</th><th>Concepto</th><th>Monto</th>
            </tr></thead><tbody>`
            + payments.map(p=>`
              <tr class="border-t">
                <td class="py-1">${fmtDate(p.paid_at)}</td>
                <td>${p.description}</td>
                <td>$${parseFloat(p.amount).toFixed(2)}</td>
              </tr>
            `).join('') +
          `</tbody></table>`
        : '<p class="text-gray-500">Aún no has registrado pagos.</p>'}
    </div>`;
})();
