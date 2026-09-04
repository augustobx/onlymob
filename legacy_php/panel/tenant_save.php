<?php
require_once 'includes/auth_check.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $id = $_POST['id'] ?? null;
    $first_name = $_POST['first_name'];
    $last_name = $_POST['last_name'];
    $dni = $_POST['dni'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];

    if ($id) { // Si hay ID, actualizamos
        $sql = "UPDATE tenants SET first_name = ?, last_name = ?, dni = ?, email = ?, phone = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$first_name, $last_name, $dni, $email, $phone, $id]);
    } else { // Si no hay ID, insertamos
        $sql = "INSERT INTO tenants (first_name, last_name, dni, email, phone) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$first_name, $last_name, $dni, $email, $phone]);
    }
    
    // Devolvemos una respuesta exitosa para que el Javascript sepa que todo fue bien
    http_response_code(200);
    echo json_encode(['message' => 'Inquilino guardado con éxito']);
    exit();
}

// Si no es POST, no hacemos nada.
http_response_code(405); // Method Not Allowed
echo json_encode(['error' => 'Método no permitido']);
?>