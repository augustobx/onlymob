<?php
// Incluye la seguridad y la conexión a la BD.
require_once 'includes/auth_check.php';

// Solo procesamos si los datos llegan por el método POST.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Recogemos todos los datos del formulario del modal.
    $id = $_POST['id'] ?? null;
    $code = $_POST['code'];
    $address = $_POST['address'];
    $type = $_POST['type'];
    // Para los campos opcionales, asignamos null si están vacíos.
    $rooms = !empty($_POST['rooms']) ? (int)$_POST['rooms'] : null;
    $sqm = !empty($_POST['sqm']) ? (float)$_POST['sqm'] : null;
    $price_rent = !empty($_POST['price_rent']) ? (float)$_POST['price_rent'] : null;
    $expenses_share = !empty($_POST['expenses_share']) ? (float)$_POST['expenses_share'] : null;
    // La columna 'status' no está en tu formulario actual, se puede añadir si es necesario.
    
    try {
        // Si el formulario envió un ID, es una ACTUALIZACIÓN (UPDATE).
        if ($id) {
            $sql = "UPDATE properties SET 
                        code = :code, 
                        address = :address, 
                        type = :type, 
                        rooms = :rooms, 
                        sqm = :sqm, 
                        price_rent = :price_rent, 
                        expenses_share = :expenses_share 
                    WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code' => $code,
                ':address' => $address,
                ':type' => $type,
                ':rooms' => $rooms,
                ':sqm' => $sqm,
                ':price_rent' => $price_rent,
                ':expenses_share' => $expenses_share,
                ':id' => $id
            ]);
        } 
        // Si no hay ID, es una CREACIÓN (INSERT).
        else {
            $sql = "INSERT INTO properties (code, address, type, rooms, sqm, price_rent, expenses_share) 
                    VALUES (:code, :address, :type, :rooms, :sqm, :price_rent, :expenses_share)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':code' => $code,
                ':address' => $address,
                ':type' => $type,
                ':rooms' => $rooms,
                ':sqm' => $sqm,
                ':price_rent' => $price_rent,
                ':expenses_share' => $expenses_share
            ]);
        }

        // Si todo sale bien, devolvemos una respuesta exitosa (código 200).
        // El Javascript en properties.php espera esto para saber que puede recargar la página.
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Propiedad guardada con éxito.']);

    } catch (PDOException $e) {
        // Si hay un error de base de datos, lo devolvemos para poder depurar.
        http_response_code(500); // Error de servidor
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
    }

    exit();
}

// Si alguien intenta acceder a este archivo sin ser por POST.
http_response_code(405); // Método no permitido
echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
?>