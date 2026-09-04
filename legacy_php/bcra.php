<?php
// ─── DEBUG: mostrará cualquier error en pantalla ────────────────
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Devolver siempre JSON
header('Content-Type: application/json; charset=utf-8');

/**
 * Trae el último valor del ICL directamente desde la API oficial del BCRA.
 *
 * @return array ['fecha' => 'YYYY-MM-DD', 'valor' => float]
 * @throws Exception si algo falla
 */
function obtenerICL_BCRA(): array
{
    // 7988 = ICL (Ley 27.551; base 30-06-2020 = 1)
    $url = 'https://api.bcra.gob.ar/estadisticas/v3.0/Monetarias/7988?limit=1';

    // ---- cURL ---------------------------------------------------
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        // Descomentá si tu PHP no tiene certificados actualizados
        // CURLOPT_SSL_VERIFYPEER => false,
    ]);

    $json = curl_exec($ch);
    if ($json === false) {
        throw new Exception('cURL: ' . curl_error($ch));
    }
    curl_close($ch);

    $resp = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

    // La API puede devolver "results" o "data"
    $arr   = $resp['results'] ?? $resp['data'] ?? null;
    $dato  = is_array($arr) ? end($arr) : null;

    if (!$dato || !isset($dato['fecha'], $dato['valor'])) {
        throw new Exception('Respuesta inesperada del BCRA');
    }

    return [
        'fecha' => $dato['fecha'],
        'valor' => (float) $dato['valor'],
    ];
}

// ─── endpoint ───────────────────────────────────────────────────
try {
    // Cache opcional: solo si querés evitar pegarle al BCRA cada vez
    /*
    $hoy = date('Y-m-d');
    $cacheFile = __DIR__ . "/cache/icl_$hoy.json";
    if (file_exists($cacheFile)) {
        echo file_get_contents($cacheFile);
        exit;
    }
    */

    $icl = obtenerICL_BCRA();
    $json = json_encode($icl, JSON_THROW_ON_ERROR);
    // file_put_contents($cacheFile, $json); // <-- descomentá si usás cache
    echo $json;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
