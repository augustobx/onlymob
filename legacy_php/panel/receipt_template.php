<?php
// panel/receipt_template.php
require __DIR__ . '/includes/auth_check.php';

// 1) Recogemos el periodo (opcional)
$period = $_GET['period'] ?? date('Y-m');

// 2) Cargamos todos los contratos vigentes con sus datos
$stmt = $pdo->prepare("
  SELECT 
    l.id AS lease_id,
    p.address AS property_address,
    p.code    AS property_code,
    CONCAT(t.first_name,' ',t.last_name) AS tenant_name,
    l.rent    AS rent_amount
  FROM leases l
  JOIN properties p ON p.id = l.property_id
  JOIN tenants t    ON t.id = l.tenant_id
  WHERE l.status = 'current'
  ORDER BY p.address, t.last_name
");
$stmt->execute();
$leases = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 3) Función para convertir número a texto (español)
function numToText($n) {
    $f = new NumberFormatter('es', NumberFormatter::SPELLOUT);
    return ucfirst($f->format($n));
}

?><!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibos de Alquiler – <?= htmlspecialchars($period) ?></title>
  <style>
    /* A4 Landscape con márgenes de 1 cm */
    @page { size: A4 landscape; margin: 1cm; }
    body {
      font-family: sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 0;
    }
    .receipt {
      float: left;
      width: 48%;
      /* altura suficiente para 2 filas (cada página ~100% alto) */
      min-height: 45%;
      margin: 1% 1%;
      padding: 12px;
      box-sizing: border-box;
      border: 1px solid #aaa;
      border-radius: 4px;
    }
    .header, .middle {
      padding-bottom: 6px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #ccc;
    }
    .header {
      display: flex;
      justify-content: space-between;
    }
    .header div { width: 32%; }
    .header .center { text-align: center; }
    .middle p { margin: 4px 0; }
    .amount {
      text-align: center;
      font-size: 1.4em;
      font-weight: bold;
    }
    .page-break {
      clear: both;
      page-break-after: always;
    }
  </style>
</head>
<body>
<?php foreach ($leases as $idx => $l):
    $receiptNo = date('Ym') . str_pad($l['lease_id'], 4, '0', STR_PAD_LEFT);
    $amtText   = numToText($l['rent_amount']);
?>
  <div class="receipt">
    <div class="header">
      <div>
        <strong>Dirección:</strong><br>
        <?= htmlspecialchars($l['property_address']) ?>
      </div>
      <div class="center">
        <strong>Recibo Nº</strong><br>
        <?= $receiptNo ?>
      </div>
      <div style="text-align:right;">
        <strong>Dpto/Num:</strong><br>
        <?= htmlspecialchars($l['property_code']) ?>
      </div>
    </div>
    <div class="middle">
      <p><strong>Inquilino:</strong> <?= htmlspecialchars($l['tenant_name']) ?></p>
      <p><strong>Monto en texto:</strong> <?= htmlspecialchars($amtText) ?> pesos</p>
      <p><strong>Mes de pago:</strong> <?= htmlspecialchars($period) ?></p>
    </div>
    <div class="amount">
      $<?= number_format($l['rent_amount'], 2) ?>
    </div>
  </div>

  <?php
    // Cada 4 recibos (2×2) forzamos salto de página
    if ((($idx + 1) % 8) === 0) {
      echo '<div class="page-break"></div>';
    }
  ?>
<?php endforeach; ?>

<!-- Asegura que se limpien floats al final -->
<div class="page-break"></div>


  <?php if (!empty($_GET['autoPrint'])): ?>
<script>
  window.addEventListener('load', () => window.print());
</script>
<?php endif; ?>
</body>
</html>