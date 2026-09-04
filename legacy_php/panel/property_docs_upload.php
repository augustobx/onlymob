<?php
// panel/property_docs_upload.php
require __DIR__ . '/includes/auth_check.php';
$db = $pdo;

// Obtenemos el DNI y saneamos para carpeta
$rawDni = $_POST['tenant_dni'] ?? '';
$cleanDni = preg_replace('/\D/', '', $rawDni);
if (!$cleanDni) {
  die('DNI inválido');
}

// Ruta base de uploads
$baseDir = __DIR__ . '/uploads/' . $cleanDni . '/';
if (!is_dir($baseDir)) {
  mkdir($baseDir, 0755, true);
}

// Función helper para mover un solo archivo
function uploadField($fieldName, $destDir) {
  if (!empty($_FILES[$fieldName]) && $_FILES[$fieldName]['error'] === UPLOAD_ERR_OK) {
    $tmp  = $_FILES[$fieldName]['tmp_name'];
    $name = basename($_FILES[$fieldName]['name']);
    move_uploaded_file($tmp, $destDir . DIRECTORY_SEPARATOR . $name);
  }
}

// Subir cada campo
uploadField('dni_front',            $baseDir);
uploadField('dni_back',             $baseDir);

// Para múltiples archivos, iteramos el array
if (!empty($_FILES['paystubs'])) {
  foreach ($_FILES['paystubs']['tmp_name'] as $i => $tmp) {
    if ($_FILES['paystubs']['error'][$i] === UPLOAD_ERR_OK) {
      $name = basename($_FILES['paystubs']['name'][$i]);
      move_uploaded_file($tmp, $baseDir . DIRECTORY_SEPARATOR . $name);
    }
  }
}

if (!empty($_FILES['guarantor_paystubs'])) {
  foreach ($_FILES['guarantor_paystubs']['tmp_name'] as $i => $tmp) {
    if ($_FILES['guarantor_paystubs']['error'][$i] === UPLOAD_ERR_OK) {
      $name = basename($_FILES['guarantor_paystubs']['name'][$i]);
      move_uploaded_file($tmp, $baseDir . DIRECTORY_SEPARATOR . $name);
    }
  }
}

// Al finalizar, redirigimos de vuelta a la vista
header("Location: property_view.php?id=" . urlencode($_POST['property_id']));
exit;
