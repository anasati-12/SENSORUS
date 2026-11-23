<!-- SECCIÓN 1: MONITOR Y TABLA DE HISTORIAL -->
<section id="sec-control" class="admin-section active-section" style="flex-direction: column; align-items: center; gap: 20px; width: 100%;">
  
  <!-- FILTROS DE ADMINISTRADOR: USUARIO Y DISPOSITIVO -->
  <div id="contenedor-filtro-admin" class="card" style="display: none; max-width: 900px; padding: 1rem;">
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      
      <!-- DESPLEGABLE 1: SELECCIONAR USUARIO -->
      <div class="input-group" style="margin-bottom: 0; flex: 1; min-width: 200px;">
        <label for="select-usuario-filtro">1. Seleccionar Usuario</label>
        <select id="select-usuario-filtro" onchange="alSeleccionarUsuarioAdmin()">
          <option value="">-- Seleccionar Usuario --</option>
        </select>
      </div>

      <!-- DESPLEGABLE 2: SELECCIONAR DISPOSITIVO DE ESE USUARIO -->
      <div class="input-group" style="margin-bottom: 0; flex: 1; min-width: 200px;">
        <label for="select-dispositivo-filtro">2. Seleccionar Dispositivo</label>
        <select id="select-dispositivo-filtro" onchange="filtrarPorDispositivoSeleccionado()">
          <option value="">-- Sin dispositivos --</option>
        </select>
      </div>

    </div>
  </div>

  <!-- TARJETA DE ESTADO EN TIEMPO REAL -->
  <div class="card">
    <div class="device-name" id="equipo">ESP32</div>
    <div id="status" class="status loading">SINCRO...</div>
    
    <div class="signal-indicator">
      Última señal recibida: <strong id="ultima-senal">Esperando datos...</strong>
    </div>
    
    <div class="info-container">
      <div class="info-box">
        <span class="info-label">Fecha</span>
        <span class="info-value" id="fecha">--/--/----</span>
      </div>
      <div class="info-box">
        <span class="info-label">Hora</span>
        <span class="info-value" id="hora">--:--:--</span>
      </div>
    </div>
  </div>

  <!-- TABLA DE HISTORIAL -->
  <div class="history-card">
    <h3>Historial de Registros</h3>
    <div class="counter" id="contador">Total de registros: 0</div>
    
    <button id="btn-borrar" class="btn-delete" style="display: none;" onclick="borrarHistorial()">Limpiar Historial</button>

    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Dispositivo</th>
          <th>Evento</th>
        </tr>
      </thead>
      <tbody id="tabla-historial">
        <tr><td colspan="4">Cargando historial...</td></tr>
      </tbody>
    </table>
  </div>
</section>
