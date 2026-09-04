<?php
// pwa/tenant_dashboard.php
require __DIR__.'/auth_check.php';
$pdo = require __DIR__.'/config.php';
$tenantId   = $_SESSION['tenant_id'];
$tenantName = $_SESSION['tenant_name'];

// 1) Cargar contratos
$stmt = $pdo->prepare("
  SELECT
    l.id AS lease_id,
    p.code AS property_code,
    p.address,
    l.start_date,
    l.end_date,
    l.rent AS rent_amount,
    l.update_period
  FROM leases l
  JOIN properties p ON p.id = l.property_id
  WHERE l.tenant_id = ?
  ORDER BY CAST(p.code AS UNSIGNED), p.code
");
$stmt->execute([$tenantId]);
$leases = $stmt->fetchAll();

// 2) Cargar deudas pendientes
$leaseIds = array_column($leases,'lease_id');
$debts = [];
if ($leaseIds) {
  $in = implode(',', array_map('intval', $leaseIds));
  foreach ($pdo->query("
    SELECT lease_id, type, description, amount-COALESCE(paid_amount,0) AS remain, due_date
    FROM debts
    WHERE lease_id IN ($in) AND amount > COALESCE(paid_amount,0)
    ORDER BY due_date
  ") as $d) {
    $debts[$d['lease_id']][] = $d;
  }
}

// 3) Cargar historial de pagos
$payments = [];
if ($leaseIds) {
  $in = implode(',', array_map('intval', $leaseIds));
  foreach ($pdo->query("
    SELECT d.lease_id, dp.amount, dp.method, dp.paid_at, d.description
    FROM debt_payments dp
    JOIN debts d ON d.id = dp.debt_id
    WHERE d.lease_id IN ($in)
    ORDER BY dp.paid_at DESC
  ") as $p) {
    $payments[$p['lease_id']][] = $p;
  }
}
?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Panel Inquilino</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing:border-box; margin:0; padding:0 }
    body { font-family:'Inter',sans-serif; background:#f3f4f6; color:#374151; }
    header { background:#4f46e5; color:#fff; padding:1rem; text-align:center; }
    header h1 { font-size:1.5rem; font-weight:600; }
    header a { color:#d1d5db; text-decoration:none; font-size:.9rem; }
    header a:hover { text-decoration:underline; }
    main { max-width:960px; margin:1rem auto; padding:0 1rem; }
    .grid { display:grid; gap:1rem; grid-template-columns:1fr; }
    @media(min-width:600px) { .grid { grid-template-columns:1fr 1fr; } }
    .card { background:#fff; border-radius:8px; padding:1rem; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
    .card h2 { font-size:1.25rem; margin-bottom:.5rem; color:#1f2937; }
    .card p { margin:.25rem 0; }
    .section { margin-top:1rem; }
    .section h3 { font-size:1.1rem; margin-bottom:.5rem; color:#1f2937; }

    /* Burbujas naranjas */
    .badge-debt {
      display:inline-block;
      margin:.25rem .25rem 0 0;
      padding:6px 10px;
      background:#ffedd5;
      color:#b45309;
      border-radius:9999px;
      font-size:.875rem;
      line-height:1.2;
    }

    details { margin-top:.5rem; }
    summary {
      cursor:pointer;
      font-weight:600;
      list-style:none;
      position:relative;
      padding-left:1.5em;
    }
    summary::before {
      content:'▶';
      position:absolute;
      left:0; top:.1em;
      font-size:.8em;
      transition: transform .2s;
    }
    details[open] summary::before {
      transform: rotate(90deg);
    }
    .payments-list {
      margin-top:.5rem;
      border-top:1px solid #e5e7eb;
      padding-top:.5rem;
    }
    .payment-item {
      display:flex;
      justify-content:space-between;
      font-size:.9rem;
      padding:.3rem 0;
      border-bottom:1px dashed #e5e7eb;
    }
    .payment-item:last-child { border-bottom:none; }
  </style>
</head>
<body>
  <header>
    <h1>Hola, <?= htmlspecialchars($tenantName) ?></h1>
    <div><a href="tenant_login.php?logout=1">Cerrar sesión</a></div>
  </header>
  <main>
    <div class="grid">
      <?php foreach ($leases as $l): ?>
      <div class="card">
        <h2>Contrato <?= htmlspecialchars($l['property_code']) ?></h2>
        <p><strong>Dirección:</strong> <?= htmlspecialchars($l['address']) ?></p>
        <p>
          <strong>Vigencia:</strong>
          <?= date('d/m/Y',strtotime($l['start_date'])) ?> –
          <?= date('d/m/Y',strtotime($l['end_date'])) ?>
        </p>
        <p>
          <strong>Alquiler:</strong> $<?= number_format($l['rent_amount'],2) ?>
          &nbsp;|&nbsp;
          <strong>Actualiza:</strong> <?= (int)$l['update_period'] ?> mes(es)
        </p>

        <div class="section">
          <h3>Deudas Pendientes</h3>
          <?php if (!empty($debts[$l['lease_id']])): ?>
            <?php foreach($debts[$l['lease_id']] as $d): ?>
              <span class="badge-debt">
                <?= htmlspecialchars($d['type']) ?>
                <?= '$'.number_format($d['remain'],2) ?>
                (vence <?= date('d/m/Y',strtotime($d['due_date'])) ?>)
              </span>
            <?php endforeach; ?>
          <?php else: ?>
            <span class="badge-debt" style="background:#d1fae5;color:#065f46;">
              Sin deudas
            </span>
          <?php endif; ?>
        </div>

        <div class="section">
          <h3>Historial de Pagos</h3>
          <details>
            <summary><?= empty($payments[$l['lease_id']]) ? 'Sin registros' : 'Ver pagos»' ?></summary>
            <?php if (!empty($payments[$l['lease_id']])): ?>
              <div class="payments-list">
                <?php foreach($payments[$l['lease_id']] as $p): ?>
                  <div class="payment-item">
                    <div>
                      <?= date('d/m/Y',strtotime($p['paid_at'])) ?>
                      – <?= htmlspecialchars($p['description']) ?>
                    </div>
                    <div>
                      $<?= number_format($p['amount'],2) ?> (<?= htmlspecialchars($p['method']) ?>)
                    </div>
                  </div>
                <?php endforeach; ?>
              </div>
            <?php endif; ?>
          </details>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </main>
</body>
</html>