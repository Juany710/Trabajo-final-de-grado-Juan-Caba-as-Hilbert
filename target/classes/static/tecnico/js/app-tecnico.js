// ==================== FIXIT TÉCNICO — OVERRIDES ====================

// Override go(): mapea pantallas de cliente a equivalentes del técnico
// y maneja las pantallas nuevas (home-tecnico, mis-reparaciones).
function go(screen) {
  if (screen === 'home')               screen = 'home-tecnico';
  if (screen === 'solicitudes-tecnico') screen = 'mis-reparaciones';
  if (screen === 'mis-solicitudes')    screen = 'mis-reparaciones';

  state.currentScreen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screen);
  if (el) {
    void el.offsetWidth; // force reflow so animation replays
    el.classList.add('active');
    el.scrollTop = 0;
  }

  if (screen === 'home-tecnico')        cargarHomeTecnico();
  if (screen === 'mis-reparaciones')    cargarMisReparaciones();
  if (screen === 'notificaciones')      cargarNotificaciones();
  if (screen === 'ganancias')           cargarGanancias();
  if (screen === 'perfil')              cargarPerfil();
  if (screen === 'perfil-email')        cargarPerfilEmail();
  if (screen === 'perfil-username')     cargarPerfilUsername();
  if (screen === 'perfil-password')     limpiarFormPassword();
  if (screen === 'perfil-direcciones')  cargarDirecciones();
  if (screen === 'perfil-privacidad')   cargarPrivacidad();
  if (screen === 'perfil-accesibilidad') cargarAccesibilidad();
  if (screen === 'perfil-notifs')       cargarNotificacionesPerfil();
  if (screen === 'chat-list')           cargarChatList();
  if (screen === 'solicitud-detail')    requestAnimationFrame(() => { if (state.sdetMap) state.sdetMap.invalidateSize(); abrirOfertasSheet(); });
  if (screen === 'cobros')              cargarCobros();
}
App.go = go;

// Override login: sin paso de ubicación
App.login = async function () {
  const email = v('li-email') || v('lin-email');
  const password = v('li-pass') || v('lin-pass');
  if (!email || !password) return mostrarToast('Completá email y contraseña');
  try {
    loading(true);
    const data = await api('POST', '/api/auth/login', { email, password, contexto: 'tecnico' });
    guardarSesion(data);
    go('home-tecnico');
  } catch (e) { mostrarToast(e.message); }
  finally { loading(false); }
};

// Override registrar: siempre tipo tecnico
App.registrar = async function () {
  const codPais = v('reg-cod-pais').replace(/\s/g, '');
  const codArea  = v('reg-cod-area').replace(/\s/g, '');
  const telNum   = v('reg-telefono-num').replace(/\s/g, '');
  const telefono = codPais && codArea && telNum ? `${codPais} ${codArea} ${telNum}` : '';
  const body = {
    nombre: v('reg-nombre'), apellido: v('reg-apellido'),
    dni: v('reg-dni'), email: v('reg-email'),
    telefono, password: v('reg-pass'),
    tipo: 'tecnico',
    especialidades: v('reg-especialidades'),
  };
  if (!body.nombre || !body.apellido || !body.dni || !body.email || !body.password)
    return mostrarToast('Completá todos los campos obligatorios');
  if (!telefono) return mostrarToast('Ingresá el teléfono completo (código de país, área y número)');
  try {
    loading(true);
    const data = await api('POST', '/api/auth/registro', body);
    guardarSesion(data);
    go('home-tecnico');
  } catch (e) { mostrarToast(e.message); }
  finally { loading(false); }
};

// Override irSolicitudes: desde solicitud-detail vuelve al mapa
App.irSolicitudes = () => go('home-tecnico');

// ==================== HOME TÉCNICO ====================
state.tecHomeSolicitudes = [];
state.tecHomeFiltro = 'Todos';
state.tecHomeMap = null;

async function cargarHomeTecnico() {
  if (!state.token) { go('login'); return; }

  const av = document.getElementById('tec-home-avatar');
  if (av) av.textContent = (state.nombre || '?')[0].toUpperCase();

  const greetingEl = document.getElementById('tec-home-brand-greeting');
  if (greetingEl && state.nombre) {
    const h = new Date().getHours();
    const sal = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    greetingEl.textContent = sal + ', ' + state.nombre;
  }

  try {
    const solicitudes = await api('GET', '/api/solicitudes/pendientes');
    state.tecHomeSolicitudes = solicitudes;
    state.tecHomeFiltro = 'Todos';

    const countEl = document.getElementById('tec-sol-count');
    if (countEl) countEl.textContent = solicitudes.length || '';
    const countSheetEl = document.getElementById('tec-sol-count-sheet');
    if (countSheetEl) countSheetEl.textContent = solicitudes.length || '';

    // Chips de categoría
    const cats = ['Todos', ...new Set(solicitudes.map(s => s.categoria.nombre))];
    const filtersEl = document.getElementById('tec-sol-filters');
    if (filtersEl) {
      filtersEl.innerHTML = cats.map(cat =>
        `<button type="button" class="tec-sol-filter-btn${cat === 'Todos' ? ' active' : ''}" data-cat="${cat}" onclick="tecHomeFiltrar(this.dataset.cat)">${cat}</button>`
      ).join('');
    }

    _renderTecSolList(solicitudes, 'Todos');
    await _initTecHomeMap(solicitudes);

  } catch (e) { mostrarToast('Error al cargar solicitudes'); }
}

async function _initTecHomeMap(solicitudes) {
  const mapEl = document.getElementById('tec-home-map');
  if (!mapEl) return;
  if (state.tecHomeMap) { state.tecHomeMap.remove(); state.tecHomeMap = null; }
  delete mapEl._leaflet_id;
  mapEl.innerHTML = '';

  const map = L.map(mapEl, {
    zoomControl: false, attributionControl: false,
    dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true
  });
  state.tecHomeMap = map;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  const posadas = [-27.3671, -55.8961];
  map.setView(posadas, 13);

  // Centrar en la ubicación real del dispositivo
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => { map.setView([pos.coords.latitude, pos.coords.longitude], 13); },
      () => {},
      { timeout: 5000 }
    );
  }

  if (!solicitudes.length) return;

  const geocoded = await Promise.all(
    solicitudes.map(s => {
      if (s.latitud && s.longitud) {
        return Promise.resolve({ s, coords: [s.latitud, s.longitud] });
      }
      return (s.ubicacion && s.ubicacion !== 'Sin ubicación'
        ? _geocodeWithFallback(s.ubicacion)
        : Promise.resolve(null))
        .then(coords => ({ s, coords }))
        .catch(() => ({ s, coords: null }));
    })
  );

  const valid = geocoded.filter(g => g.coords);
  if (!valid.length) return;

  valid.forEach(({ s, coords }) => {
    const inicial = s.cliente ? s.cliente.nombre[0].toUpperCase() : '?';
    const icon = L.divIcon({
      className: '',
      html: `<div class="tec-sol-marker"><div class="tec-sol-marker-avatar">${inicial}</div></div>`,
      iconSize: [36, 50],
      iconAnchor: [18, 50]
    });
    L.marker(coords, { icon })
      .addTo(map)
      .on('click', () => App.verSolicitud(s.id));
  });

  const bounds = L.latLngBounds(valid.map(g => g.coords));
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
}

function _renderTecSolList(solicitudes, filtro) {
  const listEl = document.getElementById('tec-sol-list');
  if (!listEl) return;
  const filtered = filtro === 'Todos'
    ? solicitudes
    : solicitudes.filter(s => s.categoria.nombre === filtro);
  if (!filtered.length) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Sin solicitudes</div><div class="empty-state-sub">No hay solicitudes en esta categoría por el momento.</div></div>';
    return;
  }
  listEl.innerHTML = filtered.map(s => `
    <div class="tec-sol-card" onclick="App.verSolicitud(${s.id})">
      <div class="tec-sol-card-top">
        <div>
          <span class="tec-sol-card-cat">${s.categoria.nombre}</span>
          <span class="tec-sol-card-num">#${String(s.id).padStart(5, '0')}</span>
        </div>
        <span class="badge badge-pendiente">Pendiente</span>
      </div>
      <div class="tec-sol-card-desc">${s.detalles ? (s.detalles.length > 70 ? s.detalles.slice(0, 70) + '…' : s.detalles) : s.categoria.nombre}</div>
      <div class="tec-sol-card-footer">
        <span class="tec-sol-card-loc">📍 ${s.ubicacion || 'Sin ubicación'}</span>
        <span class="tec-sol-card-fecha">${formatFecha(s.fechaSolicitud)}</span>
      </div>
    </div>`).join('');
}

function tecHomeFiltrar(cat) {
  state.tecHomeFiltro = cat;
  document.querySelectorAll('.tec-sol-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  _renderTecSolList(state.tecHomeSolicitudes, cat);
}

function abrirTecSolSheet() {
  const sheet = document.getElementById('tec-sol-sheet');
  if (!sheet) return;
  sheet.style.transform = '';
  sheet.style.transition = '';
  sheet.classList.add('open');
  document.getElementById('tec-sol-backdrop').classList.add('open');
  _initTecSolSheetDrag(sheet);
}

function cerrarTecSolSheet() {
  const sheet = document.getElementById('tec-sol-sheet');
  if (!sheet) return;
  sheet.style.transform = '';
  sheet.style.transition = '';
  sheet.classList.remove('open');
  document.getElementById('tec-sol-backdrop').classList.remove('open');
}

function _initTecSolSheetDrag(sheet) {
  if (sheet._dragInit) return;
  sheet._dragInit = true;
  let startY = 0, currentY = 0, dragging = false;

  sheet.addEventListener('touchstart', e => {
    const touchY = e.touches[0].clientY;
    const rect = sheet.getBoundingClientRect();
    if (touchY - rect.top > 60) return;
    startY = touchY; dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });

  sheet.addEventListener('touchmove', e => {
    if (!dragging) return;
    e.preventDefault();
    currentY = e.touches[0].clientY;
    const delta = Math.max(0, currentY - startY);
    sheet.style.transform = `translateY(${delta}px)`;
  }, { passive: false });

  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    const delta = currentY - startY;
    sheet.style.transition = '';
    if (delta > 120) cerrarTecSolSheet();
    else sheet.style.transform = '';
  });
}

// ==================== MIS REPARACIONES ====================
let _repsCache = null;

async function cargarMisReparaciones() {
  if (!state.token) { go('login'); return; }

  const av = document.getElementById('reps-top-avatar');
  if (av) av.textContent = (state.nombre || '?')[0].toUpperCase();

  const listEl    = document.getElementById('mis-reps-list');
  const resumenEl = document.getElementById('mis-reps-resumen');

  if (_repsCache) {
    if (listEl)    listEl.innerHTML    = _repsCache.list;
    if (resumenEl) resumenEl.innerHTML = _repsCache.resumen;
    _fetchReparaciones(listEl, resumenEl);
    return;
  }

  // Spinner solo si tarda más de 300ms (en red local no llega a mostrarse)
  const t = setTimeout(() => {
    if (listEl) listEl.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  }, 300);
  if (resumenEl) resumenEl.innerHTML = '';
  await _fetchReparaciones(listEl, resumenEl);
  clearTimeout(t);
}

async function _fetchReparaciones(listEl, resumenEl) {
  const wrench = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  try {
    const trabajos = await api('GET', '/api/solicitudes/mis-trabajos');

    if (!trabajos.length) {
      const empty = '<div class="empty-state"><div class="empty-state-icon">🔧</div><div class="empty-state-title">Sin reparaciones aún</div><div class="empty-state-sub">Cuando aceptes una solicitud y la completes, aparecerá acá.</div></div>';
      _repsCache = { list: empty, resumen: '' };
      if (listEl) listEl.innerHTML = empty;
      if (resumenEl) resumenEl.innerHTML = '';
      return;
    }

    const ofertasLists = await Promise.all(
      trabajos.map(s => api('GET', '/api/ofertas/solicitud/' + s.id).catch(() => []))
    );

    const enProceso   = trabajos.filter(s => ['En proceso', 'PendienteConfirmacion'].includes(s.estado));
    const finalizadas = trabajos.filter(s => s.estado === 'Finalizado');
    let totalFacturado = 0;

    const getPrecio = s => {
      const ofertas  = ofertasLists[trabajos.indexOf(s)];
      const miOferta = ofertas.find(o => o.tecnico && o.tecnico.idUsuario === state.userId && o.estado === 'Aceptada');
      return miOferta ? Number(miOferta.precio) : null;
    };

    let html = '';

    if (enProceso.length) {
      html += `<div class="msol-section"><div class="msol-wrap">
        <div class="msol-section-title">Actualmente</div>
        ${enProceso.map(s => {
          const precio = getPrecio(s);
          return `<div class="msol-card" onclick="App.verSolicitud(${s.id})">
            <div class="msol-card-icon">${wrench}</div>
            <div class="msol-card-content">
              <div class="msol-card-top">
                <span class="msol-card-estado">${s.estado === 'PendienteConfirmacion' ? 'Confirmación pendiente' : 'En proceso'}</span>
                <span class="msol-card-substatus">${s.cliente.nombre} ${s.cliente.apellido}</span>
              </div>
              <div class="msol-card-desc">${s.categoria.nombre}${precio ? ' · $' + precio.toLocaleString('es-AR') : ''}</div>
              <small class="msol-card-date">${formatFecha(s.fechaSolicitud)}</small>
            </div>
          </div>`;
        }).join('')}
      </div></div>`;
    }

    if (finalizadas.length) {
      finalizadas.forEach(s => { const p = getPrecio(s); if (p) totalFacturado += p; });
      html += `<div class="msol-section"><div class="msol-wrap">
        <div class="msol-section-title">Reparaciones anteriores</div>
        <div class="msol-section-body--list">
          ${finalizadas.map(s => {
            const precio = getPrecio(s);
            return `<div class="msol-row" onclick="App.verSolicitud(${s.id})">
              <div class="msol-row-icon">${wrench}</div>
              <div class="msol-row-content">
                <div class="msol-row-title">${s.cliente.nombre} ${s.cliente.apellido}</div>
                <div class="msol-row-desc">${s.categoria.nombre}${precio ? ' · $' + precio.toLocaleString('es-AR') : ''}</div>
                <small class="msol-row-date">${formatFecha(s.fechaSolicitud)}</small>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div></div>`;
    }

    const resumenHtml = `<div class="mis-reps-summary">
      <div class="mis-reps-stat"><span class="mis-reps-stat-val">${finalizadas.length}</span><span class="mis-reps-stat-label">Completadas</span></div>
      <div class="mis-reps-divider"></div>
      <div class="mis-reps-stat"><span class="mis-reps-stat-val">${enProceso.length}</span><span class="mis-reps-stat-label">En proceso</span></div>
      <div class="mis-reps-divider"></div>
      <div class="mis-reps-stat"><span class="mis-reps-stat-val">$${totalFacturado.toLocaleString('es-AR')}</span><span class="mis-reps-stat-label">Facturado</span></div>
    </div>`;

    _repsCache = { list: html, resumen: resumenHtml };
    if (listEl)    listEl.innerHTML    = html;
    if (resumenEl) resumenEl.innerHTML = resumenHtml;

  } catch (e) { if (!_repsCache) mostrarToast('Error al cargar reparaciones'); }
}

// Override cargarNotificaciones(): solo notificaciones relevantes para el técnico
async function cargarNotificaciones() {
  const el = document.getElementById('notif-body');
  if (!el) return;
  el.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';

  let html = '<div class="notif-section-title">Actividad</div>';

  try {
    const [ofertas, trabajos] = await Promise.all([
      api('GET', '/api/ofertas/mis-ofertas'),
      api('GET', '/api/solicitudes/mis-trabajos')
    ]);

    const aceptadas = ofertas.filter(o => o.estado === 'Aceptada');
    const finalizados = trabajos.filter(t => t.estado === 'Finalizado');

    if (aceptadas.length) {
      html += aceptadas.map(o => `
        <div class="notif-item" onclick="App.verSolicitud(${o.solicitudId})">
          <div class="notif-icon">✅</div>
          <div class="notif-info">
            <strong>¡Tu oferta fue aceptada!</strong>
            <small>$${Number(o.precio).toLocaleString('es-AR')} · ${o.modalidad}</small>
          </div>
          <span class="notif-chevron">›</span>
        </div>`).join('');
    } else {
      html += '<div class="notif-empty">Sin actividad reciente</div>';
    }

    if (finalizados.length >= 3) {
      const totalFacturado = 0;
      html += `
        <div class="notif-section-title" style="margin-top:8px">Resumen</div>
        <div class="notif-item">
          <div class="notif-icon">📊</div>
          <div class="notif-info">
            <strong>Llevas ${finalizados.length} reparaciones completadas</strong>
            <small>Seguí así para mejorar tu calificación</small>
          </div>
        </div>`;
    }
  } catch (e) {
    html += '<div class="notif-empty">Sin actividad reciente</div>';
  }

  html += `
    <div class="notif-section-title" style="margin-top:8px">Para vos</div>
    <div class="notif-promo-card" onclick="mostrarToast('Próximamente disponible')">
      <div class="notif-promo-icon">⭐</div>
      <div class="notif-promo-info">
        <strong>FIXIT Pro — técnicos verificados</strong>
        <small>Aumentá tu visibilidad en la plataforma</small>
      </div>
      <button class="notif-promo-btn" onclick="event.stopPropagation();mostrarToast('Próximamente')">Ver más</button>
    </div>
    <div class="notif-promo-card" onclick="mostrarToast('Próximamente disponible')">
      <div class="notif-promo-icon">📈</div>
      <div class="notif-promo-info">
        <strong>Herramientas para técnicos</strong>
        <small>Gestioná tu agenda y presupuestos</small>
      </div>
      <button class="notif-promo-btn" onclick="event.stopPropagation();mostrarToast('Próximamente')">Ver más</button>
    </div>`;

  el.innerHTML = html;
}

// ===== PERFIL: calificaciones filtradas por contexto 'tecnico' =====
async function cargarPerfil() {
  _setAvatares();
  const nombreCompleto = (state.nombre + ' ' + state.apellido).trim();
  document.getElementById('perfil-nombre-full').textContent = nombreCompleto || '—';
  // Cobros sub-text
  const cobrosSubEl = document.getElementById('perfil-cobros-sub');
  if (cobrosSubEl) {
    const cbu   = localStorage.getItem('fixit_cobros_cbu')   || '';
    const alias = localStorage.getItem('fixit_cobros_alias') || '';
    const mp    = localStorage.getItem('fixit_cobros_mp')    || '';
    if (alias)      cobrosSubEl.textContent = 'Alias: ' + alias;
    else if (cbu)   cobrosSubEl.textContent = 'CBU: ****' + cbu.slice(-4);
    else if (mp)    cobrosSubEl.textContent = 'MP: ' + mp;
    else            cobrosSubEl.textContent = 'Configurar CBU / Alias';
  }
  document.getElementById('perfil-username-display').textContent = state.telefono || 'Sin teléfono';
  document.getElementById('perfil-email-display').textContent = state.email || '—';
  const tipoEl = document.getElementById('perfil-tipo-sub');
  if (tipoEl) tipoEl.textContent = 'Técnico';
  try {
    const cnt = await api('GET', '/api/solicitudes/finalizadas/count');
    const subEl = document.getElementById('perfil-solicitudes-sub');
    if (subEl) subEl.textContent = cnt.count + ' Reparación' + (cnt.count !== 1 ? 'es' : '') + ' completada' + (cnt.count !== 1 ? 's' : '');
  } catch(e) {}
  const starsEl = document.getElementById('perfil-stars');
  const labelEl = document.getElementById('perfil-cal-label');
  if (starsEl && state.userId) {
    try {
      const data = await api('GET', '/api/calificaciones/usuario/' + state.userId + '/contexto/tecnico');
      const prom = data.total > 0 ? parseFloat(data.promedio) : 5.0;
      if (labelEl) { labelEl.textContent = 'Calificación - ' + prom.toFixed(2); labelEl.classList.remove('perfil-cal-label-hidden'); }
      starsEl.innerHTML = renderStarsFull(prom);
    } catch(e) {
      if (labelEl) { labelEl.textContent = 'Calificación - 5.00'; labelEl.classList.remove('perfil-cal-label-hidden'); }
      starsEl.innerHTML = renderStarsFull(5);
    }
  }
}

// ==================== COBROS ====================
function cargarCobros() {
  const fields = [
    { key: 'cbu',        inputId: 'cobros-cbu-input',      displayId: 'cobros-cbu-display',      mask: v => v ? 'CBU guardado (****' + v.slice(-4) + ')' : 'No configurado' },
    { key: 'alias',      inputId: 'cobros-alias-input',    displayId: 'cobros-alias-display',    mask: v => v || 'No configurado' },
    { key: 'mp',         inputId: 'cobros-mp-input',       displayId: 'cobros-mp-display',       mask: v => v || 'No configurado' },
    { key: 'precio-min', inputId: 'cobros-preciomin-input', displayId: 'cobros-preciomin-display', mask: v => v ? '$' + Number(v).toLocaleString('es-AR') + ' mín.' : 'Sin mínimo configurado' },
  ];
  fields.forEach(({ key, inputId, displayId, mask }) => {
    const stored = localStorage.getItem('fixit_cobros_' + key) || '';
    const dispEl = document.getElementById(displayId);
    const inpEl  = document.getElementById(inputId);
    if (dispEl) dispEl.textContent = mask(stored);
    if (inpEl)  inpEl.value = stored;
  });
}

function toggleCobrosForm(key) {
  const formEl = document.getElementById('cobros-form-' + key);
  if (!formEl) return;
  const isOpen = formEl.classList.contains('open');
  document.querySelectorAll('.cobros-inline-form.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) formEl.classList.add('open');
}

function guardarCobros(key) {
  const inputIds = { 'cbu': 'cobros-cbu-input', 'alias': 'cobros-alias-input', 'mp': 'cobros-mp-input', 'precio-min': 'cobros-preciomin-input' };
  const displayIds = { 'cbu': 'cobros-cbu-display', 'alias': 'cobros-alias-display', 'mp': 'cobros-mp-display', 'precio-min': 'cobros-preciomin-display' };
  const masks = {
    'cbu': v => v ? 'CBU guardado (****' + v.slice(-4) + ')' : 'No configurado',
    'alias': v => v || 'No configurado',
    'mp': v => v || 'No configurado',
    'precio-min': v => v ? '$' + Number(v).toLocaleString('es-AR') + ' mín.' : 'Sin mínimo configurado',
  };
  const inpEl = document.getElementById(inputIds[key]);
  if (!inpEl) return;
  const val = inpEl.value.trim();
  if (key === 'cbu' && val && val.length !== 22) { mostrarToast('El CBU debe tener 22 dígitos'); return; }
  localStorage.setItem('fixit_cobros_' + key, val);
  const dispEl = document.getElementById(displayIds[key]);
  if (dispEl) dispEl.textContent = masks[key](val);
  const formEl = document.getElementById('cobros-form-' + key);
  if (formEl) formEl.classList.remove('open');
  mostrarToast(val ? '✅ Guardado correctamente' : 'Dato eliminado');
  // Update the perfil sub text if we're on that screen
  const cobrosSubEl = document.getElementById('perfil-cobros-sub');
  if (cobrosSubEl) {
    const alias = localStorage.getItem('fixit_cobros_alias') || '';
    const cbu   = localStorage.getItem('fixit_cobros_cbu')   || '';
    const mp    = localStorage.getItem('fixit_cobros_mp')    || '';
    if (alias)    cobrosSubEl.textContent = 'Alias: ' + alias;
    else if (cbu) cobrosSubEl.textContent = 'CBU: ****' + cbu.slice(-4);
    else if (mp)  cobrosSubEl.textContent = 'MP: ' + mp;
    else          cobrosSubEl.textContent = 'Configurar CBU / Alias';
  }
}

// ===== PRIVACIDAD: clave separada para la app técnico =====
function cargarPrivacidad() {
  const prefs = JSON.parse(localStorage.getItem('fixit_tec_privacidad') || '{}');
  const defaults = { 'priv-perfil-publico': true, 'priv-ubicacion': true, 'priv-historial': true, 'priv-analytics': false, 'priv-marketing': false };
  Object.entries(defaults).forEach(([id, def]) => {
    const el = document.getElementById(id);
    if (el) el.checked = id in prefs ? prefs[id] : def;
  });
}
function guardarPrivacidad() {
  const ids = ['priv-perfil-publico','priv-ubicacion','priv-historial','priv-analytics','priv-marketing'];
  const prefs = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) prefs[id] = el.checked; });
  localStorage.setItem('fixit_tec_privacidad', JSON.stringify(prefs));
  mostrarToast('Preferencias guardadas');
}

// ===== ACCESIBILIDAD: clave separada para la app técnico =====
function cargarAccesibilidad() {
  const prefs = JSON.parse(localStorage.getItem('fixit_tec_accesibilidad') || '{}');
  const ids = ['acc-dark-mode', 'acc-contraste', 'acc-texto-grande', 'acc-animaciones'];
  const defaults = { 'acc-dark-mode': false, 'acc-contraste': false, 'acc-texto-grande': false, 'acc-animaciones': false };
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = id in prefs ? prefs[id] : defaults[id];
  });
  aplicarAccesibilidad(prefs);
}
function guardarAccesibilidad() {
  const ids = ['acc-dark-mode', 'acc-contraste', 'acc-texto-grande', 'acc-animaciones'];
  const prefs = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) prefs[id] = el.checked; });
  localStorage.setItem('fixit_tec_accesibilidad', JSON.stringify(prefs));
  aplicarAccesibilidad(prefs);
}

function ganShowBarTip(el) {
  document.querySelectorAll('.gan-bar-tip').forEach(t => t.classList.remove('visible'));
  const tip = el.querySelector('.gan-bar-tip');
  if (tip) { tip.classList.add('visible'); setTimeout(() => tip.classList.remove('visible'), 2000); }
}

// ==================== GANANCIAS ====================

let _ganPeriodo = 'semana';

async function cargarGanancias(periodo) {
  if (!state.token) { go('login'); return; }
  if (periodo) _ganPeriodo = periodo;

  const av = document.getElementById('gan-top-avatar');
  if (av) av.textContent = (state.nombre || '?')[0].toUpperCase();

  const body = document.getElementById('ganancias-body');
  if (!body) return;

  const tGan = setTimeout(() => {
    body.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  }, 300);

  try {
    const [trabajos, misOfertas, calData] = await Promise.all([
      api('GET', '/api/solicitudes/mis-trabajos'),
      api('GET', '/api/ofertas/mis-ofertas').catch(() => []),
      api('GET', '/api/calificaciones/usuario/' + state.userId + '/contexto/tecnico').catch(() => ({ promedio: 0, total: 0 }))
    ]);

    const ofertasLists = await Promise.all(
      trabajos.map(s => api('GET', '/api/ofertas/solicitud/' + s.id).catch(() => []))
    );
    clearTimeout(tGan);

    const getPrecio = s => {
      const lista = ofertasLists[trabajos.indexOf(s)];
      const o = lista.find(o => o.tecnico && o.tecnico.idUsuario === state.userId && o.estado === 'Aceptada');
      return o ? Number(o.precio) : 0;
    };

    const finalizadas = trabajos.filter(s => s.estado === 'Finalizado');

    const hoy = new Date();
    const diasAtras = n => new Date(hoy.getTime() - n * 86400000);

    const filtrarPor = (lista, dias) => dias === 0 ? lista
      : lista.filter(s => new Date(s.fechaSolicitud) >= diasAtras(dias));

    const dias = _ganPeriodo === 'semana' ? 7 : _ganPeriodo === 'mes' ? 30 : 0;
    const diasAnt = dias;
    const actual = filtrarPor(finalizadas, dias);
    const anterior = dias === 0 ? [] : finalizadas.filter(s => {
      const f = new Date(s.fechaSolicitud);
      return f >= diasAtras(dias * 2) && f < diasAtras(dias);
    });

    const totalActual   = actual.reduce((a, s) => a + getPrecio(s), 0);
    const totalAnterior = anterior.reduce((a, s) => a + getPrecio(s), 0);
    const promedio = actual.length ? Math.round(totalActual / actual.length) : 0;

    let compareHtml = '';
    if (dias > 0) {
      if (totalAnterior === 0 && totalActual === 0) {
        compareHtml = `<div class="gan-main-compare neutral">Sin datos en el período</div>`;
      } else if (totalAnterior === 0) {
        compareHtml = `<div class="gan-main-compare up">↑ Primer período con ingresos</div>`;
      } else {
        const pct = Math.round(((totalActual - totalAnterior) / totalAnterior) * 100);
        const cls = pct >= 0 ? 'up' : 'down';
        const signo = pct >= 0 ? '↑' : '↓';
        compareHtml = `<div class="gan-main-compare ${cls}">${signo} ${Math.abs(pct)}% vs período anterior</div>`;
      }
    }

    const labelPeriodo = _ganPeriodo === 'semana' ? 'Últimos 7 días'
      : _ganPeriodo === 'mes' ? 'Últimos 30 días' : 'Historial completo';

    // Gráfico de barras
    let buckets = [];
    if (_ganPeriodo === 'semana') {
      const dias7 = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
      buckets = Array.from({length: 7}, (_, i) => {
        const d = diasAtras(6 - i);
        const key = d.toDateString();
        const total = finalizadas
          .filter(s => new Date(s.fechaSolicitud).toDateString() === key)
          .reduce((a, s) => a + getPrecio(s), 0);
        const dow = (d.getDay() + 6) % 7;
        return { label: dias7[dow], total };
      });
    } else if (_ganPeriodo === 'mes') {
      // S1=oldest(21-30d), S2(14-21d), S3(7-14d), S4=newest(0-7d)
      buckets = Array.from({length: 4}, (_, i) => {
        const desdeDias = (3 - i) * 7;
        const hastaDias = Math.min((4 - i) * 7, 30);
        const desde = desdeDias === 0 ? hoy : diasAtras(desdeDias);
        const hasta = diasAtras(hastaDias);
        const total = finalizadas
          .filter(s => { const f = new Date(s.fechaSolicitud); return f <= desde && f > hasta; })
          .reduce((a, s) => a + getPrecio(s), 0);
        return { label: 'S' + (i + 1), total };
      });
    } else {
      // Últimos 12 meses en orden cronológico, mes actual a la derecha
      const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const ahora = new Date();
      buckets = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - 11 + i, 1);
        const yr = d.getFullYear();
        const mo = d.getMonth();
        const total = finalizadas
          .filter(s => { const f = new Date(s.fechaSolicitud); return f.getFullYear() === yr && f.getMonth() === mo; })
          .reduce((a, s) => a + getPrecio(s), 0);
        const label = MESES[mo];
        return { label, total };
      });
    }
    const maxBucket = Math.max(...buckets.map(b => b.total), 1);
    const chartHtml = buckets.map((b, idx) => {
      const pct = Math.round((b.total / maxBucket) * 100);
      const tipTxt = b.total > 0 ? '$' + b.total.toLocaleString('es-AR') : '—';
      return `<div class="gan-bar-col" onclick="ganShowBarTip(this)">
        <div class="gan-bar-tip">${tipTxt}</div>
        <div class="gan-bar-wrap"><div class="gan-bar ${b.total === 0 ? 'empty' : ''}" style="height:${Math.max(pct, b.total>0?8:3)}%"></div></div>
        <div class="gan-bar-label">${b.label}</div>
      </div>`;
    }).join('');

    // Tasa de cierre
    const ofertasEnviadas  = misOfertas.length;
    const ofertasAceptadas = misOfertas.filter(o => o.estado === 'Aceptada').length;
    const tasaCierre = ofertasEnviadas > 0 ? Math.round((ofertasAceptadas / ofertasEnviadas) * 100) : 0;

    // Por categoría
    const porCat = {};
    finalizadas.forEach(s => {
      const cat = s.categoria.nombre;
      const p   = getPrecio(s);
      porCat[cat] = (porCat[cat] || 0) + p;
    });
    const totalCat  = Object.values(porCat).reduce((a, v) => a + v, 0) || 1;
    const catHtml = Object.entries(porCat)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, monto]) => {
        const pct = Math.round((monto / totalCat) * 100);
        return `<div class="gan-cat-row">
          <div class="gan-cat-header">
            <span class="gan-cat-name">${cat}</span>
            <span class="gan-cat-amount">$${monto.toLocaleString('es-AR')}</span>
          </div>
          <div class="gan-cat-track"><div class="gan-cat-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join('');

    // Reputación
    const prom = calData.promedio || 0;
    const totalCals = calData.total || 0;
    const estrellas = Math.round(prom);
    const starsHtml = Array.from({length: 5}, (_, i) =>
      `<span class="gan-star">${i < estrellas ? '★' : '☆'}</span>`).join('');

    body.innerHTML = `
      <div class="gan-period-tabs">
        <button class="gan-tab ${_ganPeriodo==='semana'?'active':''}" onclick="cargarGanancias('semana')">Semana</button>
        <button class="gan-tab ${_ganPeriodo==='mes'?'active':''}" onclick="cargarGanancias('mes')">Mes</button>
        <button class="gan-tab ${_ganPeriodo==='todo'?'active':''}" onclick="cargarGanancias('todo')">Todo</button>
      </div>

      <div class="gan-main-card">
        <div class="gan-main-label">${labelPeriodo}</div>
        <div class="gan-main-amount">$${totalActual.toLocaleString('es-AR')}</div>
        ${compareHtml}
      </div>

      <div class="gan-quick-stats">
        <div class="gan-quick-card">
          <div class="gan-quick-val">${actual.length}</div>
          <div class="gan-quick-label">Reparaciones</div>
        </div>
        <div class="gan-quick-card">
          <div class="gan-quick-val">${actual.length ? '$' + promedio.toLocaleString('es-AR') : '—'}</div>
          <div class="gan-quick-label">Promedio</div>
        </div>
      </div>

      <div class="gan-section">
        <div class="gan-section-title">Ingresos por período</div>
        <div class="gan-chart">${chartHtml}</div>
      </div>

      <div class="gan-section">
        <div class="gan-section-title">Actividad</div>
        <div class="gan-stat-row">
          <span class="gan-stat-key">Tasa de cierre</span>
          <span class="gan-stat-val">${tasaCierre}% <span style="font-size:12px;font-weight:400;color:#888">(${ofertasAceptadas}/${ofertasEnviadas})</span></span>
        </div>
        <div class="gan-stat-row">
          <span class="gan-stat-key">En proceso ahora</span>
          <span class="gan-stat-val">${trabajos.filter(s=>s.estado==='En proceso').length}</span>
        </div>
        <div class="gan-stat-row">
          <span class="gan-stat-key">Total histórico</span>
          <span class="gan-stat-val">$${finalizadas.reduce((a,s)=>a+getPrecio(s),0).toLocaleString('es-AR')}</span>
        </div>
      </div>

      ${catHtml ? `<div class="gan-section">
        <div class="gan-section-title">Por categoría (histórico)</div>
        ${catHtml}
      </div>` : ''}

      <div class="gan-section">
        <div class="gan-section-title">Reputación</div>
        <div class="gan-rep-row">
          <div>
            <div class="gan-stars">${starsHtml}</div>
            <div class="gan-rating-sub">${totalCals} reseña${totalCals !== 1 ? 's' : ''}</div>
          </div>
          <div class="gan-rating-big">${prom > 0 ? prom.toFixed(1) : '—'}</div>
        </div>
      </div>`;

  } catch(e) { body.innerHTML = '<div class="empty-state"><p>Error al cargar ganancias</p></div>'; }
}

// ==================== SHEET HACER OFERTA ====================

App.verSolicitud = async function(id) {
  try {
    loading(true);
    const [sol, ofertas] = await Promise.all([
      api('GET', '/api/solicitudes/' + id),
      api('GET', '/api/ofertas/solicitud/' + id).catch(() => [])
    ]);
    state.solicitudActual = sol;

    // Si tengo una oferta aceptada y el servicio está activo → pantalla servicio
    const miOfertaAceptada = ofertas.find(o => o.tecnico && o.tecnico.idUsuario === state.userId && o.estado === 'Aceptada');
    if (miOfertaAceptada && ['En proceso', 'PendienteConfirmacion'].includes(sol.estado)) {
      cerrarTecOfertaSheet();
      cerrarTecSolSheet();
      renderServicio(miOfertaAceptada, sol);
      go('servicio');
      return;
    }

    document.getElementById('tec-of-categoria').textContent = sol.categoria ? sol.categoria.nombre : '';
    document.getElementById('tec-of-ubicacion').textContent = sol.ubicacion || '';
    document.getElementById('tec-of-detalles').textContent = sol.detalles || '';

    const miOferta = ofertas.find(o => o.tecnico && o.tecnico.idUsuario === state.userId);
    const miOfertaEl = document.getElementById('tec-of-mi-oferta');
    const formEl = document.getElementById('tec-of-form');

    if (miOferta) {
      const colorEstado = { Pendiente: '#f59e0b', Aceptada: '#22c55e', Rechazada: '#ef4444' };
      const col = colorEstado[miOferta.estado] || '#888';
      miOfertaEl.innerHTML = `
        <div class="tec-of-estado-card" style="border-color:${col}33">
          <div class="tec-of-estado-row">
            <span class="tec-of-estado-title">Tu oferta enviada</span>
            <span class="tec-of-estado-badge" style="background:${col}18;color:${col}">${miOferta.estado}</span>
          </div>
          <span class="tec-of-detalle">💰 $${Number(miOferta.precio).toLocaleString('es-AR')}</span>
          <span class="tec-of-detalle">📋 ${miOferta.modalidad || '—'}</span>
          <span class="tec-of-detalle">⏱ ${miOferta.tiempoEstimado || '—'}</span>
          ${miOferta.garantiaMeses ? `<span class="tec-of-detalle">🛡 ${miOferta.garantiaMeses} meses de garantía</span>` : ''}
          ${miOferta.descripcionOferta ? `<span class="tec-of-detalle" style="color:#888">"${miOferta.descripcionOferta}"</span>` : ''}
        </div>`;
      formEl.style.display = 'none';
    } else {
      miOfertaEl.innerHTML = '';
      formEl.style.display = 'flex';
      // Reset form
      document.getElementById('tec-of-modalidad').value = 'Presencial';
      document.getElementById('tec-of-precio').value = '';
      document.getElementById('tec-of-tiempo').value = '';
      document.getElementById('tec-of-garantia').value = '0';
      document.getElementById('tec-of-descripcion').value = '';
      document.getElementById('tec-of-transporte-wrap').style.display = 'none';
    }

    // Cerrar sheet de solicitudes si está abierto
    cerrarTecSolSheet();
    // Abrir sheet de oferta
    const sheet = document.getElementById('tec-oferta-sheet');
    const backdrop = document.getElementById('tec-oferta-backdrop');
    sheet.classList.add('open');
    backdrop.classList.add('open');
  } catch(e) {
    mostrarToast('Error al cargar solicitud');
  } finally {
    loading(false);
  }
};

function cerrarTecOfertaSheet() {
  document.getElementById('tec-oferta-sheet').classList.remove('open');
  document.getElementById('tec-oferta-backdrop').classList.remove('open');
}

function tecOfModalidadChange() {
  const esRemoto = document.getElementById('tec-of-modalidad').value === 'Remoto';
  document.getElementById('tec-of-transporte-wrap').style.display = esRemoto ? 'block' : 'none';
}

async function tecEnviarOferta() {
  const sol = state.solicitudActual;
  if (!sol) return;
  const precio = document.getElementById('tec-of-precio').value;
  const modalidad = document.getElementById('tec-of-modalidad').value;
  const tiempoEstimado = document.getElementById('tec-of-tiempo').value;
  const garantiaMeses = parseInt(document.getElementById('tec-of-garantia').value || '0');
  const precioTransporte = modalidad === 'Remoto' ? parseFloat(document.getElementById('tec-of-transporte').value || '0') : 0;
  const descripcionOferta = document.getElementById('tec-of-descripcion').value || '';
  if (!precio) return mostrarToast('Ingresá un precio');
  if (!tiempoEstimado) return mostrarToast('Ingresá el tiempo estimado');
  try {
    loading(true);
    await api('POST', '/api/ofertas/solicitud/' + sol.id,
      { precio: parseFloat(precio), modalidad, tiempoEstimado, garantiaMeses, precioTransporte, descripcionOferta });
    mostrarToast('¡Oferta enviada!');
    cerrarTecOfertaSheet();
  } catch(e) {
    mostrarToast(e.message || 'Error al enviar oferta');
  } finally {
    loading(false);
  }
}

// Aplicar accesibilidad técnico al cargar la app
(function() {
  const prefs = JSON.parse(localStorage.getItem('fixit_tec_accesibilidad') || '{}');
  aplicarAccesibilidad(prefs);
})();
