<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/../configuracion/firebase.php';
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars(APP_TITLE) ?></title>
  
  <!-- Hoja de Estilos -->
  <link rel="stylesheet" href="recursos/css/styles.css">
  
  <!-- Firebase SDKs v9 (Compatibilidad) -->
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>

  <!-- Inyección de Configuración desde PHP -->
  <script>
    const FIREBASE_CONFIG = <?= json_encode($firebaseConfig, JSON_UNESCAPED_SLASHES) ?>;
  </script>
</head>
<body>
