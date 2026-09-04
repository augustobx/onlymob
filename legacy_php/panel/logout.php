<?php
require __DIR__ . '/../config.php'; // Necesario para acceder a la sesión

session_unset();
session_destroy();

header('Location: login.php');
exit();