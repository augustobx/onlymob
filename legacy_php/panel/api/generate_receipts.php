<?php
// panel/api/generate_receipts.php
require __DIR__ . '/../includes/auth_check.php';
require __DIR__ . '/../../vendor/autoload.php'; // Ajusta según tu ruta real a vendor/autoload.php

use Dompdf\Dompdf;

// 1) Traer contratos vigentes y cálculo de totales
$stmt = $pdo->prepare("
  SELECT
    gl.id                   AS lease_id,
    CONCAT(t.first_name,' ',t.last_name) AS tenant_name,
    t.dni,
    g.address       AS garage_address,
    GROUP_CONCAT(gs.space_number ORDER BY CAST(gs.space_number AS UNSIGNED) SEPARATOR ', ') AS spaces,
    gl.rent,
    COUNT(gs.id) * gl.rent       AS total_rent,
    gl.tenant_id AS dpto         -- reutilizamos tenant_id como “Dpto” de ejemplo
  FROM garage_leases gl
  JOIN tenants t           ON t.id = gl.tenant_id
  JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
  JOIN garage_spaces gs       ON gs.id        = gls.space_id
  JOIN garages g              ON g.id         = gs.garage_id
  WHERE gl.status = 'current'
  GROUP BY gl.id, t.first_name, t.last_name, t.dni, g.address, gl.rent
");
$stmt->execute();
$leases = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Inicializar Dompdf y NumberFormatter
$dompdf = new Dompdf();
$fmt    = new NumberFormatter('es', NumberFormatter::SPELLOUT);
$period = (new DateTime())->format('m/Y');

// 2) Construir el HTML
$html = <<<HTML
<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8"/>
  <style>
    body { margin:0; padding:0; font-family: sans-serif; }
    .page { page-break-after: always; padding:20px; }
    table.header { width:100%; border-collapse: collapse; margin-bottom:30px; }
    table.header td { border:1px solid #000; padding:4px; vertical-align: top; }
    .left { font-size:18px; font-weight:bold; }
    .right small { display:block; }
    .section { margin-bottom:20px; }
    .field { margin-bottom:8px; }
    .label { display:inline-block; width:120px; font-weight:bold; }
    .total { text-align:right; font-size:20px; font-weight:bold; margin-top:30px; }
  </style>
</head><body>
HTML;

foreach ($leases as $l) {
    // monto en texto
    $text = strtoupper($fmt->format($l['total_rent']));
    $text = preg_replace('/\s+$/','',$text).' PESOS';
    $reciboNo = "{$l['lease_id']} - ".str_replace('/','', $period);
    $fecha    = (new DateTime())->format('d/m/Y');
    $dpto     = htmlspecialchars($l['dpto']);
    $tenant   = htmlspecialchars($l['tenant_name']);
    $concepto = "Alquiler ". DateTime::createFromFormat('m/Y','01/'.$period)->format('F Y');
    $totalFmt = '$'.number_format($l['total_rent'],2,',','.');

    $html .= <<<HTML
  <div class="page">
    <table class="header">
      <tr>
        <td class="left">TRES DE FEBRERO</td>
        <td class="right" style="width:200px;">
          Recibo<br/>
          <small>N° $reciboNo</small>
          <small>Fecha: $fecha</small>
          <small>Dpto: $dpto</small>
        </td>
      </tr>
    </table>
    <div class="section">
      <div class="field"><span class="label">Recibí de:</span> $tenant</div>
      <div class="field"><span class="label">La suma de pesos:</span> $text</div>
      <div class="field"><span class="label">En concepto de:</span> $concepto</div>
    </div>
    <div class="total">Total &nbsp;&nbsp; $totalFmt</div>
  </div>
HTML;
}

$html .= '</body></html>';

// 3) Renderizar y enviar PDF
$dompdf->loadHtml($html);
$dompdf->setPaper('A4','portrait');
$dompdf->render();
$dompdf->stream("recibos_{$period}.pdf", ["Attachment"=>false]);
exit;
