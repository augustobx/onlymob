<?php
// panel/api/garage_preview_increase.php
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/../includes/auth_check.php';
$db = $pdo;

/* ─── Validar método y % ───────────────────────────── */
if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'])) {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$percent = (float)($_REQUEST['percent'] ?? 0);
if ($percent <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Porcentaje inválido']);
    exit;
}

/* ─── Traer contratos vigentes con sus plazas ─────── */
$sql = "
   SELECT
       gl.id                                                AS lease_id,
       CONCAT(g.address)                                    AS cochera,
       GROUP_CONCAT(gs.space_number ORDER BY CAST(gs.space_number AS UNSIGNED)
                    SEPARATOR ', ')                         AS plazas,
       gl.rent                                              AS rent
   FROM garage_leases  gl
   /* cada plaza asociada a ese contrato */
   JOIN garage_lease_spaces gls ON gls.lease_id = gl.id
   JOIN garage_spaces       gs  ON gs.id       = gls.space_id
   /* cochera física */
   JOIN garages             g   ON g.id        = gs.garage_id
   WHERE gl.status = 'current'
   GROUP BY gl.id
";
$rows = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

/* ─── Calcular pre-aumento y devolver array plano ─── */
$out = [];
foreach ($rows as $r) {
    $old = (float)$r['rent'];
    $new = round($old * (1 + $percent/100), 2);
    $out[] = [
        'lease_id' => (int)$r['lease_id'],
        'unidad'   => "{$r['cochera']} (Plazas {$r['plazas']})",
        'old_rent' => $old,
        'new_rent' => $new
    ];
}

echo json_encode($out);          // ← array directo, no {data:…}
