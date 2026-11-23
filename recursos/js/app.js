// INICIALIZACIÓN DE FIREBASE CON CONFIGURACIÓN INYECTADA DESDE PHP (configuracion/firebase.php)
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

const secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, "SecondaryApp");
const secondaryAuth = secondaryApp.auth();

const $ = id => document.getElementById(id);
let unsubscribeHistorial = null;
let intervaloRelojSenal = null;
let ultimoRegistroActual = null;
let esUsuarioAdmin = false;
let misDispositivosCliente = [];
let mapaUsuariosDispositivos = {};

// CONVERTIDOR UNIVERSAL DE DISPOSITIVOS (Soporta Mapas, Arreglos y Cadenas)
function normalizarDispositivos(rawDispositivos) {
  if (!rawDispositivos) return [];
  
  if (Array.isArray(rawDispositivos)) {
    return rawDispositivos.map(item => String(item).trim()).filter(Boolean);
  }
  
  if (typeof rawDispositivos === 'object') {
    return Object.keys(rawDispositivos).map(item => item.trim()).filter(Boolean);
  }
  
  if (typeof rawDispositivos === 'string') {
    return rawDispositivos.split(',').map(item => item.trim()).filter(Boolean);
  }
  
  return [];
}

// UTILIDAD PARA CONVERTIR CUALQUIER FORMATO DE FECHA/TIMESTAMP A MILISEGUNDOS
function obtenerMilisegundos(reg) {
  if (!reg) return 0;

  if (reg.timestamp) {
    if (typeof reg.timestamp.toMillis === 'function') {
      return reg.timestamp.toMillis();
    }
    if (!isNaN(Number(reg.timestamp))) {
      const num = Number(reg.timestamp);
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = Date.parse(reg.timestamp);
    if (!isNaN(parsed)) return parsed;
  }

  if (reg.fecha && reg.hora) {
    let fechaStr = reg.fecha.trim();
    if (fechaStr.includes('/')) {
      const partes = fechaStr.split('/');
      if (partes.length === 3 && partes[0].length === 2) {
        fechaStr = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    }
    const combinada = Date.parse(`${fechaStr}T${reg.hora.trim()}`);
    if (!isNaN(combinada)) return combinada;
  }

  return 0;
}

// FORMATEAR TIEMPO TRANSCURRIDO DESDE LA ÚLTIMA SEÑAL
function formatearUltimaSenal(reg) {
  const ms = obtenerMilisegundos(reg);
  const textoExacto = `${reg.fecha || '--/--/----'} a las ${reg.hora || '--:--:--'}`;
  
  if (!ms) return textoExacto;

  const diffSeg = Math.floor((Date.now() - ms) / 1000);
  if (diffSeg < 0) return `Recién (${textoExacto})`;
  if (diffSeg < 60) return `Hace ${diffSeg} seg (${reg.hora})`;
  
  const diffMin = Math.floor(diffSeg / 60);
  if (diffMin < 60) return `Hace ${diffMin} min (${reg.hora})`;
  
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `Hace ${diffHoras} h (${reg.hora})`;

  return textoExacto;
}

// ACTUALIZAR CONTADOR DE ÚLTIMA SEÑAL CADA SEGUNDO
function iniciarActualizadorSenal(registro) {
  ultimoRegistroActual = registro;
  if ($('ultima-senal')) {
    $('ultima-senal').textContent = formatearUltimaSenal(registro);
  }
  if (intervaloRelojSenal) clearInterval(intervaloRelojSenal);
  intervaloRelojSenal = setInterval(() => {
    if (ultimoRegistroActual && $('ultima-senal')) {
      $('ultima-senal').textContent = formatearUltimaSenal(ultimoRegistroActual);
    }
  }, 1000);
}

// CONTROL DE SESIÓN Y ROLES
auth.onAuthStateChanged(async (user) => {
  if (user) {
    if ($('login-view')) $('login-view').style.display = 'none';
    if ($('dashboard-view')) $('dashboard-view').style.display = 'flex';

    try {
      const userDoc = await db.collection('usuarios').doc(user.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      esUsuarioAdmin = (userData && userData.rol === 'admin');
      misDispositivosCliente = normalizarDispositivos(userData.dispositivos);

      if ($('user-display')) {
        $('user-display').textContent = `${user.email} (${esUsuarioAdmin ? 'Administrador' : 'Cliente'})`;
      }
      
      if ($('admin-nav-bar')) $('admin-nav-bar').style.display = esUsuarioAdmin ? 'flex' : 'none';
      if ($('btn-borrar')) $('btn-borrar').style.display = esUsuarioAdmin ? 'block' : 'none';

      if (esUsuarioAdmin) {
        cargarUsuariosAdmin();
        await cargarFiltroUsuariosAdmin();
        cambiarPestanaAdmin('sec-control');
        mostrarHistorialVacio("Seleccione un usuario y un dispositivo para ver sus registros.");
      } else {
        if ($('contenedor-filtro-admin')) $('contenedor-filtro-admin').style.display = 'none';
        document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('active-section'));
        if ($('sec-registrar')) $('sec-registrar').style.display = 'none';
        if ($('sec-gestion')) $('sec-gestion').style.display = 'none';
        
        escucharHistorial(false, misDispositivosCliente);
      }
    } catch (e) {
      console.error("Error al iniciar sesión del usuario:", e);
    }

  } else {
    if ($('login-view')) $('login-view').style.display = 'block';
    if ($('dashboard-view')) $('dashboard-view').style.display = 'none';
    if (unsubscribeHistorial) unsubscribeHistorial();
    if (intervaloRelojSenal) clearInterval(intervaloRelojSenal);
  }
});

// 1. CARGAR LISTA DE USUARIOS (PANEL ADMIN)
async function cargarFiltroUsuariosAdmin() {
  const selectUsuario = $('select-usuario-filtro');
  if (!selectUsuario) return;

  if ($('contenedor-filtro-admin')) $('contenedor-filtro-admin').style.display = 'block';
  selectUsuario.innerHTML = '<option value="">-- Seleccionar Usuario --</option>';
  mapaUsuariosDispositivos = {};

  try {
    const snapshotUsuarios = await db.collection('usuarios').get();
    
    snapshotUsuarios.docs.forEach(doc => {
      const data = doc.data();
      const uid = doc.id;
      const email = data.email || uid;
      const dispositivos = normalizarDispositivos(data.dispositivos);

      mapaUsuariosDispositivos[uid] = { email, dispositivos };

      const option = document.createElement('option');
      option.value = uid;
      option.textContent = email;
      selectUsuario.appendChild(option);
    });

    actualizarDesplegableDispositivos([]);
  } catch (error) {
    console.error("Error al cargar lista de usuarios:", error);
  }
}

// 2. SELECCIÓN DE USUARIO EN PANEL ADMIN
async function alSeleccionarUsuarioAdmin() {
  const userUid = $('select-usuario-filtro').value;

  if (!userUid) {
    if (unsubscribeHistorial) unsubscribeHistorial();
    actualizarDesplegableDispositivos([]);
    mostrarHistorialVacio("Seleccione un usuario y un dispositivo para ver sus registros.");
    return;
  }

  try {
    const docUser = await db.collection('usuarios').doc(userUid).get();
    let listaDispositivos = [];

    if (docUser.exists) {
      listaDispositivos = normalizarDispositivos(docUser.data().dispositivos);
    } else if (mapaUsuariosDispositivos[userUid]) {
      listaDispositivos = mapaUsuariosDispositivos[userUid].dispositivos;
    }
    
    actualizarDesplegableDispositivos(listaDispositivos);

    if (listaDispositivos.length === 0) {
      if (unsubscribeHistorial) unsubscribeHistorial();
      mostrarHistorialVacio("Este usuario no tiene dispositivos asignados.");
    } else {
      if (unsubscribeHistorial) unsubscribeHistorial();
      mostrarHistorialVacio("Seleccione un dispositivo para este usuario.");
    }
  } catch (error) {
    console.error("Error al seleccionar usuario:", error);
    mostrarHistorialVacio("Error al consultar el usuario.");
  }
}

function actualizarDesplegableDispositivos(dispositivos) {
  const selectDispositivo = $('select-dispositivo-filtro');
  if (!selectDispositivo) return;

  selectDispositivo.innerHTML = '';

  if (dispositivos.length === 0) {
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "-- Sin dispositivos --";
    selectDispositivo.appendChild(option);
    return;
  }

  const optionDefault = document.createElement('option');
  optionDefault.value = "";
  optionDefault.textContent = "-- Seleccionar Dispositivo --";
  selectDispositivo.appendChild(optionDefault);

  dispositivos.forEach(dev => {
    const option = document.createElement('option');
    option.value = dev;
    option.textContent = dev;
    selectDispositivo.appendChild(option);
  });
}

function filtrarPorDispositivoSeleccionado() {
  const devSeleccionado = $('select-dispositivo-filtro').value;

  if (!devSeleccionado) {
    if (unsubscribeHistorial) unsubscribeHistorial();
    mostrarHistorialVacio("Seleccione un dispositivo para ver sus registros.");
    return;
  }

  escucharHistorial(true, devSeleccionado);
}

// RENDERIZAR TABLA Y PANEL PRINCIPAL EN ORDEN CRONOLÓGICO
function renderizarHistorialYPanel(docs) {
  docs.sort((a, b) => obtenerMilisegundos(b) - obtenerMilisegundos(a));

  let html = '';
  const ultimo = docs[0];

  docs.forEach((reg) => {
    const esAbierta = reg.evento && reg.evento.toUpperCase().includes("ABIERTA");
    const badgeClass = esAbierta ? "badge" : "closed-badge";

    html += `
      <tr>
        <td>${reg.fecha || '--'}</td>
        <td>${reg.hora || '--'}</td>
        <td>${reg.equipo || '--'}</td>
        <td><span class="${badgeClass}">${reg.evento || '--'}</span></td>
      </tr>`;
  });

  if (ultimo) {
    if ($('equipo')) $('equipo').textContent = ultimo.equipo || "ESP32";
    if ($('status')) {
      $('status').textContent = ultimo.evento || "DESCONOCIDO";
      const esAbierta = ultimo.evento && ultimo.evento.toUpperCase().includes("ABIERTA");
      $('status').className = esAbierta ? "status open" : "status closed";
    }
    if ($('fecha')) $('fecha').textContent = ultimo.fecha || "--/--/----";
    if ($('hora')) $('hora').textContent = ultimo.hora || "--:--:--";
    iniciarActualizadorSenal(ultimo);
  }

  if ($('contador')) $('contador').textContent = `Total de registros: ${docs.length}`;
  if ($('tabla-historial')) $('tabla-historial').innerHTML = html;
}

// 3. SUSCRIPCIÓN EN TIEMPO REAL A HISTORIAL
function escucharHistorial(esConsultaDirecta, filtro) {
  if (unsubscribeHistorial) unsubscribeHistorial();

  let query = db.collection('historial').orderBy('timestamp', 'desc');

  if (esConsultaDirecta) {
    if (filtro) {
      query = query.where('equipo', '==', filtro);
    } else {
      mostrarHistorialVacio("Seleccione un dispositivo válido.");
      return;
    }
  } else {
    const listaEquipos = Array.isArray(filtro) ? filtro : misDispositivosCliente;
    
    if (!listaEquipos || listaEquipos.length === 0) {
      mostrarHistorialVacio("Sin dispositivos asignados a esta cuenta.");
      return;
    }
    query = query.where('equipo', 'in', listaEquipos.slice(0, 10));
  }

  unsubscribeHistorial = query.limit(50).onSnapshot((snapshot) => {
    if (snapshot.empty) {
      mostrarHistorialVacio("No hay registros disponibles para el dispositivo seleccionado.");
      return;
    }

    const docs = snapshot.docs.map(doc => doc.data());
    renderizarHistorialYPanel(docs);
  }, (error) => {
    console.error("Error al escuchar historial de Firestore:", error);
    
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      console.warn("Reintentando consulta ordenando localmente...");
      escucharHistorialSinIndice(esConsultaDirecta, filtro);
    } else {
      mostrarHistorialVacio("Error de permisos o lectura en Firestore.");
    }
  });
}

// FUNCIÓN FALLBACK (Ordenamiento local sin índice compuesto)
function escucharHistorialSinIndice(esConsultaDirecta, filtro) {
  let query = db.collection('historial');

  if (esConsultaDirecta) {
    if (filtro) {
      query = query.where('equipo', '==', filtro);
    } else {
      return;
    }
  } else {
    const listaEquipos = Array.isArray(filtro) ? filtro : misDispositivosCliente;
    if (!listaEquipos || listaEquipos.length === 0) return;
    query = query.where('equipo', 'in', listaEquipos.slice(0, 10));
  }

  unsubscribeHistorial = query.limit(100).onSnapshot((snapshot) => {
    if (snapshot.empty) {
      mostrarHistorialVacio("No hay registros disponibles para el dispositivo seleccionado.");
      return;
    }

    const docs = snapshot.docs.map(doc => doc.data());
    renderizarHistorialYPanel(docs);
  });
}

function mostrarHistorialVacio(mensaje = "No hay registros disponibles.") {
  ultimoRegistroActual = null;
  if (intervaloRelojSenal) clearInterval(intervaloRelojSenal);

  if ($('equipo')) $('equipo').textContent = "SIN DISPOSITIVO";
  if ($('status')) {
    $('status').textContent = "SIN REGISTROS";
    $('status').className = "status loading";
  }
  if ($('ultima-senal')) $('ultima-senal').textContent = "Sin señal recibida";
  if ($('fecha')) $('fecha').textContent = "--/--/----";
  if ($('hora')) $('hora').textContent = "--:--:--";
  
  if ($('tabla-historial')) {
    $('tabla-historial').innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">${mensaje}</td></tr>`;
  }
  if ($('contador')) $('contador').textContent = "Total de registros: 0";
}

// GESTIÓN DE PESTAÑAS
function cambiarPestanaAdmin(idSeccion) {
  document.querySelectorAll('.admin-section').forEach(sec => {
    sec.classList.remove('active-section');
    sec.style.display = 'none';
  });
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));

  const seccionObjetivo = $(idSeccion);
  if (seccionObjetivo) {
    seccionObjetivo.style.display = 'flex';
    seccionObjetivo.classList.add('active-section');
  }

  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(idSeccion)) {
      tab.classList.add('active');
    }
  });
}

// CREAR USUARIOS CON MAPA DE DISPOSITIVOS
async function registrarNuevoUsuario() {
  const email = $('new-user-email').value.trim();
  const pass = $('new-user-pass').value;
  const role = $('new-user-role').value;
  const devicesInput = $('new-user-device') ? $('new-user-device').value.trim() : "";

  if (!email || !pass) return alert("Por favor completa el correo y la contraseña.");

  try {
    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
    const newUser = userCredential.user;

    const listaDevs = devicesInput.split(',').map(d => d.trim()).filter(Boolean);
    const mapaDevs = {};
    listaDevs.forEach(dev => { mapaDevs[dev] = true; });

    await db.collection('usuarios').doc(newUser.uid).set({
      email: email,
      rol: role,
      dispositivos: mapaDevs
    });

    await secondaryAuth.signOut();
    alert(`Usuario (${role}) creado exitosamente.`);
    $('new-user-email').value = '';
    $('new-user-pass').value = '';
    if ($('new-user-device')) $('new-user-device').value = '';

    await cargarFiltroUsuariosAdmin();
  } catch (err) {
    alert("Error al registrar: " + err.message);
  }
}

// CARGA DE TABLA DE ADMINISTRACIÓN DE USUARIOS
function cargarUsuariosAdmin() {
  db.collection('usuarios').onSnapshot((snapshot) => {
    const tbody = $('tabla-usuarios-admin');
    if (!tbody) return;

    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay usuarios registrados.</td></tr>';
      return;
    }

    let html = '';
    snapshot.docs.forEach(doc => {
      const uid = doc.id;
      const user = doc.data();
      const listaDispositivos = normalizarDispositivos(user.dispositivos).join(', ');

      html += `
        <tr>
          <td><input type="email" id="email-input-${uid}" value="${user.email || ''}" class="table-input" style="min-width: 150px;"></td>
          <td><input type="password" id="pass-input-${uid}" placeholder="Nueva clave" class="table-input" style="min-width: 100px;"></td>
          <td><strong>${user.rol || 'cliente'}</strong></td>
          <td><input type="text" id="dev-input-${uid}" value="${listaDispositivos}" class="table-input" style="min-width: 140px;"></td>
          <td style="display: flex; gap: 6px; justify-content: center;">
            <button class="btn-save" onclick="guardarCambiosUsuario('${uid}')">Guardar</button>
            <button class="btn-delete" style="margin:0; padding: 4px 8px; font-size: 0.8rem;" onclick="eliminarUsuario('${uid}')">Eliminar</button>
          </td>
        </tr>`;
    });
    tbody.innerHTML = html;
  });
}

async function guardarCambiosUsuario(uid) {
  const nuevoEmail = $(`email-input-${uid}`).value.trim();
  const inputDevs = $(`dev-input-${uid}`).value.trim();

  const listaDevs = inputDevs.split(',').map(d => d.trim()).filter(Boolean);
  const mapaDevs = {};
  listaDevs.forEach(dev => { mapaDevs[dev] = true; });

  try {
    await db.collection('usuarios').doc(uid).update({
      email: nuevoEmail,
      dispositivos: mapaDevs
    });
    alert('Usuario actualizado correctamente.');
    await cargarFiltroUsuariosAdmin();
  } catch (error) {
    alert('Error al actualizar: ' + error.message);
  }
}

async function eliminarUsuario(uid) {
  if (confirm("¿Está seguro de eliminar este usuario?")) {
    try {
      await db.collection('usuarios').doc(uid).delete();
      await cargarFiltroUsuariosAdmin();
    } catch (error) {
      alert("Error al eliminar usuario: " + error.message);
    }
  }
}

async function borrarHistorial() {
  if (confirm("¿Está seguro de borrar todo el historial de registros?")) {
    try {
      const snapshot = await db.collection('historial').get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      alert("Error al borrar historial: " + error.message);
    }
  }
}

function iniciarSesion() {
  const email = $('login-email').value.trim();
  const pass = $('login-password').value;
  auth.signInWithEmailAndPassword(email, pass).catch(err => alert("Error: " + err.message));
}

function cerrarSesion() { 
  auth.signOut(); 
}
