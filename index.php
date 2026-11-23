<?php
require_once __DIR__ . '/componentes/header.php';
require_once __DIR__ . '/vistas/login.php';
?>

<!-- PANEL PRINCIPAL (DASHBOARD) -->
<div id="dashboard-view">
  
  <!-- BARRA SUPERIOR DE USUARIO -->
  <header class="header-bar">
    <div>
      <span id="user-display">Cargando usuario...</span>
    </div>
    <button class="btn-logout" onclick="cerrarSesion()">Cerrar Sesión</button>
  </header>

  <!-- BARRA DE NAVEGACIÓN ADMINISTRATIVA -->
  <nav id="admin-nav-bar" class="admin-nav" style="display: none;">
    <button class="nav-tab active" onclick="cambiarPestanaAdmin('sec-control')">Monitor e Historial</button>
    <button class="nav-tab" onclick="cambiarPestanaAdmin('sec-registrar')">Registrar Usuario</button>
    <button class="nav-tab" onclick="cambiarPestanaAdmin('sec-gestion')">Gestión de Clientes</button>
  </nav>

  <?php
  require_once __DIR__ . '/vistas/monitor.php';
  require_once __DIR__ . '/vistas/registrar_usuario.php';
  require_once __DIR__ . '/vistas/gestion_usuarios.php';
  ?>

</div>

<?php
require_once __DIR__ . '/componentes/footer.php';
?>
