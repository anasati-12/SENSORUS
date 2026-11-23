<!-- SECCIÓN 2: REGISTRAR NUEVO USUARIO -->
<section id="sec-registrar" class="admin-section">
  <div class="card admin-card">
    <h3>Registrar Usuario</h3>
    
    <div class="input-group">
      <label for="new-user-email">Correo Electrónico</label>
      <input type="email" id="new-user-email" placeholder="cliente@dominio.com">
    </div>

    <div class="input-group">
      <label for="new-user-pass">Contraseña</label>
      <input type="password" id="new-user-pass" placeholder="Mínimo 6 caracteres">
    </div>

    <div class="input-group">
      <label for="new-user-role">Rol de Usuario</label>
      <select id="new-user-role">
        <option value="cliente">Cliente</option>
        <option value="admin">Administrador</option>
      </select>
    </div>

    <div class="input-group">
      <label for="new-user-device">Dispositivos Asignados (Separados por coma)</label>
      <input type="text" id="new-user-device" placeholder="ESP32_1, ESP32_2">
    </div>

    <button class="btn-primary" onclick="registrarNuevoUsuario()">Guardar Usuario</button>
  </div>
</section>
