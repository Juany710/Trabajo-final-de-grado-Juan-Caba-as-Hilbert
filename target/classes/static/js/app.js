// ==================== ESTADO GLOBAL ====================
const state = {
  token: localStorage.getItem('fixit_token'),
  userId: parseInt(localStorage.getItem('fixit_userId')) || null,
  nombre: localStorage.getItem('fixit_nombre') || '',
  apellido: localStorage.getItem('fixit_apellido') || '',
  email: localStorage.getItem('fixit_email') || '',
  tipo: localStorage.getItem('fixit_tipo') || null,
  tipoId: parseInt(localStorage.getItem('fixit_tipoId')) || null,
  telefono: localStorage.getItem('fixit_telefono') || '',
  emailTemp: '',
  tipoRegistro: 'cliente',
  tecnicoSeleccionado: null,
  solicitudActual: null,
  solicitudFromScreen: 'home',
  ofertaActual: null,
  chatRecipientId: null,
  chatRecipientNombre: '',
  map: null,
  sdetMap: null,
  sdetOrden: 'calificacion',
  chatPollInterval: null,
  calificarData: null,
  _pendingAceptar: null,
  ubicacionActual: localStorage.getItem('fixit_ubicacion') || '',
  ubicacionRequerida: false,
  _solicitudPendiente: null,
};

const API = '';

// ==================== API HELPER ====================
async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = state.token;
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(API + path, opts);
  if (!r.ok) {
    if (r.status === 401) {
      ['fixit_token','fixit_userId','fixit_nombre','fixit_apellido','fixit_email','fixit_tipo','fixit_tipoId','fixit_telefono'].forEach(k => localStorage.removeItem(k));
      state.token = null; state.userId = null; state.tipo = null;
      go('login');
      throw new Error('Sesión expirada. Volvé a iniciar sesión.');
    }
    const err = await r.json().catch(() => ({ error: 'Error de conexión' }));
    throw new Error(err.error || 'Error del servidor');
  }
  return r.json();
}

// ==================== NAVEGACIÓN ====================
function go(screen) {
  state.currentScreen = screen;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screen);
  if (el) {
    void el.offsetWidth; // force reflow so animation replays
    el.classList.add('active');
    el.scrollTop = 0;
  }
  if (screen === 'ubicacion') cargarUbicacion();
  if (screen === 'home') cargarHome();
  if (screen === 'search') initSearch();
  if (screen === 'chat-list') cargarChatList();
  if (screen === 'notificaciones') cargarNotificaciones();
  if (screen === 'perfil') cargarPerfil();
  if (screen === 'perfil-email') cargarPerfilEmail();
  if (screen === 'perfil-username') cargarPerfilUsername();
  if (screen === 'perfil-password') limpiarFormPassword();
  if (screen === 'perfil-direcciones') cargarDirecciones();
  if (screen === 'perfil-privacidad') cargarPrivacidad();
  if (screen === 'perfil-accesibilidad') cargarAccesibilidad();
  if (screen === 'perfil-notifs') cargarNotificacionesPerfil();
  if (screen === 'mis-solicitudes') cargarMisSolicitudes();
  if (screen === 'solicitudes-tecnico') cargarSolicitudesTecnico();
  if (screen === 'solicitud-detail') requestAnimationFrame(() => { if (state.sdetMap) state.sdetMap.invalidateSize(); });
}

// ==================== AUTH ====================
const App = {
  mostrarLogin() { go('login'); },
  mostrarRegistro() { go('registro'); },

  selTipo(tipo) {
    state.tipoRegistro = tipo;
    document.getElementById('btn-cliente').classList.toggle('active', tipo === 'cliente');
    document.getElementById('btn-tecnico').classList.toggle('active', tipo === 'tecnico');
    document.getElementById('reg-tecnico-extra').classList.toggle('hidden', tipo !== 'tecnico');
  },

  async registrar() {
    const codPais = v('reg-cod-pais').replace(/\s/g,'');
    const codArea = v('reg-cod-area').replace(/\s/g,'');
    const telNum  = v('reg-telefono-num').replace(/\s/g,'');
    const telefono = codPais && codArea && telNum ? `${codPais} ${codArea} ${telNum}` : '';
    const body = {
      nombre: v('reg-nombre'), apellido: v('reg-apellido'),
      dni: v('reg-dni'), email: v('reg-email'),
      telefono, password: v('reg-pass'),
      tipo: state.tipoRegistro,
      especialidades: v('reg-especialidades'),
    };
    if (!body.nombre || !body.apellido || !body.dni || !body.email || !body.password)
      return mostrarToast('Completá todos los campos obligatorios');
    if (!telefono)
      return mostrarToast('Ingresá el teléfono completo (código de país, área y número)');
    try {
      loading(true);
      const data = await api('POST', '/api/auth/registro', body);
      guardarSesion(data);
      go(data.tipo === 'cliente' ? 'ubicacion' : 'home');
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  async login() {
    const email = v('li-email') || v('lin-email'), password = v('li-pass') || v('lin-pass');
    if (!email || !password) return mostrarToast('Completá email y contraseña');
    try {
      loading(true);
      const data = await api('POST', '/api/auth/login', { email, password, contexto: 'cliente' });
      guardarSesion(data);
      go(data.tipo === 'cliente' ? 'ubicacion' : 'home');
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  cerrarSesion() {
    document.getElementById('modal-confirm-logout').style.display = 'flex';
  },
  confirmarLogout() {
    document.getElementById('modal-confirm-logout').style.display = 'none';
    ['fixit_token','fixit_userId','fixit_nombre','fixit_apellido','fixit_email','fixit_tipo','fixit_tipoId','fixit_telefono','fixit_ubicacion'].forEach(k => localStorage.removeItem(k));
    state.token = null; state.userId = null; state.tipo = null; state.ubicacionActual = '';
    go('login');
  },
  cancelarLogout() {
    document.getElementById('modal-confirm-logout').style.display = 'none';
  },

  irSolicitudes() {
    if (state.tipo === 'tecnico') go('solicitudes-tecnico');
    else go('mis-solicitudes');
  },

  irSolicitudNueva() {
    state.solicitudFromScreen = 'tecnico';
    cargarCategoriasSelect();
    go('solicitud');
  },

  async irSolicitudRapida(tipo) {
    state.solicitudFromScreen = 'home';
    try {
      loading(true);
      await cargarCategoriasSelect(tipo);
      go('solicitud');
    } catch(e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  volverDeSolicitud() {
    go(state.solicitudFromScreen || 'home');
  },

  async crearSolicitud() {
    const inp = document.getElementById('sol-categoria');
    const catId = parseInt(inp.value);
    const tipo = inp.dataset.tipo || '';
    const cfg = SOL_CONFIG[tipo];
    if (!catId || !cfg) return mostrarToast('Seleccioná una categoría');

    const subcat   = v('sol-subcategoria');
    const marca    = cfg.showMarca  ? v('sol-marca')  : '';
    const modelo   = cfg.showModelo ? v('sol-modelo') : '';
    const ident    = v('sol-identificador');
    const desc     = v('sol-detalles');

    if (!subcat) return mostrarToast(`Seleccioná ${cfg.subcatLabel}`);
    if (cfg.showMarca && !marca) return mostrarToast('Ingresá la marca');
    if (cfg.showModelo && !modelo) return mostrarToast('Ingresá el modelo');
    if (!cfg.identOpcional && !ident) return mostrarToast(`Ingresá ${cfg.identLabel}`);

    const partes = [
      `Tipo: ${subcat}`,
      marca  ? `Marca: ${marca}`   : '',
      modelo ? `Modelo: ${modelo}` : '',
      ident  ? `${cfg.identLabel}: ${ident}` : '',
      desc   ? `Descripción: ${desc}` : '',
    ].filter(Boolean);
    const detalles = partes.join(' | ');

    const ubicacion = state.ubicacionActual || localStorage.getItem('fixit_ubicacion') || '';
    if (!ubicacion) {
      state.ubicacionRequerida = true;
      state._solicitudPendiente = { categoriaId: catId, detalles };
      go('ubicacion');
      return;
    }

    try {
      loading(true);
      await api('POST', '/api/solicitudes', { categoriaId: catId, detalles, ubicacion });
      mostrarToast('¡Solicitud enviada!');
      go('mis-solicitudes');
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  async verSolicitud(id) {
    try {
      loading(true);
      const sol = await api('GET', '/api/solicitudes/' + id);
      const ofertas = await api('GET', '/api/ofertas/solicitud/' + id);
      state.solicitudActual = sol;
      const aceptada = ofertas.find(o => o.estado === 'Aceptada');
      const estadoActivo = ['En proceso', 'PendienteConfirmacion'].includes(sol.estado);
      if (aceptada && estadoActivo) {
        renderServicio(aceptada, sol);
        go('servicio');
      } else {
        renderSolicitudDetalle(sol, ofertas);
        go('solicitud-detail');
        requestAnimationFrame(() => _initSdetMap(sol, ofertas));
      }
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  async hacerOferta() {
    if (!state.solicitudActual) return;
    const precio = v('of-precio');
    const modalidad = v('of-modalidad');
    const tiempoEstimado = v('of-tiempo');
    const garantiaMeses = parseInt(v('of-garantia') || '0');
    const precioTransporte = modalidad === 'Remoto' ? parseFloat(v('of-transporte') || '0') : 0;
    const descripcionOferta = v('of-descripcion') || '';
    if (!precio) return mostrarToast('Ingresá un precio');
    if (!tiempoEstimado) return mostrarToast('Ingresá el tiempo estimado');
    try {
      loading(true);
      await api('POST', '/api/ofertas/solicitud/' + state.solicitudActual.id,
        { precio: parseFloat(precio), modalidad, tiempoEstimado, garantiaMeses, precioTransporte, descripcionOferta });
      mostrarToast('¡Oferta enviada!');
      App.verSolicitud(state.solicitudActual.id);
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  aceptarOferta(idOferta, precio, modalidad, tiempoEstimado) {
    const sol = state.solicitudActual;
    const fmtPrecio = '$' + Number(precio).toLocaleString('es-AR');
    document.getElementById('modal-aceptar-titulo').textContent = '¿Confirmar selección?';
    document.getElementById('modal-aceptar-sub').textContent =
      `Vas a contratar este servicio por ${fmtPrecio} (${modalidad}). Una vez confirmado el técnico será notificado.`;
    document.getElementById('modal-aceptar-oferta').style.display = 'flex';
    state._pendingAceptar = { idOferta, precio, modalidad, tiempoEstimado };
  },

  async rechazarOferta(idOferta) {
    try {
      loading(true);
      await api('PUT', '/api/ofertas/' + idOferta + '/rechazar');
      mostrarToast('Oferta rechazada');
      App.verSolicitud(state.solicitudActual.id);
    } catch (e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  async finalizarServicio(solId) {
    if (!confirm('¿Marcar este servicio como finalizado?')) return;
    try {
      loading(true);
      const res = await api('PUT', '/api/solicitudes/' + solId + '/finalizar');
      mostrarToast('✅ Servicio finalizado');
      state.calificarData = {
        destinatarioId: res.tecnicoIdUsuario,
        solicitudId: res.solicitudId,
        nombre: res.tecnicoNombre || 'el técnico',
        titulo: 'Calificar al técnico',
        subtitulo: 'Calificá cómo fue el servicio recibido',
        contexto: 'tecnico',
      };
      mostrarPantallaCalificar();
    } catch(e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  async verificarYCalificar(solId) {
    try {
      loading(true);
      const sol = state.solicitudActual;
      const esTecnico = state.tipo === 'tecnico';
      if (esTecnico) {
        state.calificarData = {
          destinatarioId: sol.cliente.idUsuario,
          solicitudId: solId,
          nombre: sol.cliente.nombre + ' ' + sol.cliente.apellido,
          titulo: 'Calificar al cliente',
          subtitulo: 'Servicio: ' + sol.categoria.nombre,
          contexto: 'cliente',
        };
      } else {
        const ofertas = await api('GET', '/api/ofertas/solicitud/' + solId);
        const aceptada = ofertas.find(o => o.estado === 'Aceptada');
        if (!aceptada) { mostrarToast('No se encontró el técnico'); return; }
        state.calificarData = {
          destinatarioId: aceptada.tecnico.idUsuario,
          solicitudId: solId,
          nombre: aceptada.tecnico.nombre + ' ' + aceptada.tecnico.apellido,
          titulo: 'Calificar al técnico',
          subtitulo: 'Servicio: ' + sol.categoria.nombre,
          contexto: 'tecnico',
        };
      }
      mostrarPantallaCalificar();
    } catch(e) { mostrarToast(e.message); }
    finally { loading(false); }
  },

  omitirCalificacion() {
    state.calificarData = null;
    go(state.tipo === 'tecnico' ? 'solicitudes-tecnico' : 'mis-solicitudes');
  },

  confirmarPago() {
    mostrarToast('✅ ¡Pedido confirmado! El técnico se pondrá en contacto.');
    setTimeout(() => go('home'), 1500);
  },

  verTecnico(tec) {
    state.tecnicoSeleccionado = tec;
    renderTecnicoDetalle(tec);
    go('tecnico');
  },

  async buscar(q) {
    try {
      const lista = await api('GET', '/api/tecnicos/buscar?q=' + encodeURIComponent(q));
      renderTecnicosList(lista);
    } catch (e) { mostrarToast('Error al buscar técnicos'); }
  },

  filtrarTipo(tipo) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    App.buscar(tipo);
  },

  abrirChat(userId, nombre) {
    state.chatRecipientId = userId;
    state.chatRecipientNombre = nombre;
    state.chatBackScreen = state.currentScreen || 'servicio';
    document.getElementById('chat-nombre').textContent = nombre;
    document.getElementById('chat-estado').textContent = 'Activo';
    cargarMensajes(userId);
    go('chat');
  },

  async enviarMensaje() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg || !state.chatRecipientId) return;
    input.value = '';
    try {
      const data = await api('POST', '/api/chat', {
        receptorId: state.chatRecipientId, mensaje: msg
      });
      appendMensaje(data, true);
    } catch (e) { mostrarToast('Error al enviar'); }
  },

  grabarAudio() { mostrarToast('Audio próximamente'); },
  enviarImagen() { mostrarToast('Imágenes próximamente'); },
  mostrarToast,
  go,
};

// ==================== SESION ====================
function guardarSesion(data) {
  state.token = data.token;
  state.userId = data.userId;
  state.nombre = data.nombre;
  state.apellido = data.apellido || '';
  state.email = data.email || '';
  state.tipo = data.tipo;
  state.tipoId = data.tipoId;
  localStorage.setItem('fixit_token', data.token);
  localStorage.setItem('fixit_userId', data.userId);
  localStorage.setItem('fixit_nombre', data.nombre);
  localStorage.setItem('fixit_apellido', data.apellido || '');
  localStorage.setItem('fixit_email', data.email || '');
  localStorage.setItem('fixit_tipo', data.tipo);
  if (data.tipoId) localStorage.setItem('fixit_tipoId', data.tipoId);
  state.telefono = data.telefono || '';
  localStorage.setItem('fixit_telefono', data.telefono || '');
}

// ==================== HOME ====================
const _bannerSlides = [
  { bg: 'linear-gradient(135deg,#e8eaf6,#f3e5f5)', icon: '🔧', title: 'Encontrá técnicos\ncerca tuyo', sub: 'Reparaciones a domicilio' },
  { bg: 'linear-gradient(135deg,#e3f2fd,#e8f5e9)', icon: '💬', title: 'Chat en\ntiempo real', sub: 'Hablá directo con tu técnico' },
  { bg: 'linear-gradient(135deg,#fff8e1,#fce4ec)', icon: '🛡️', title: 'Seguro de\nHogar FIXIT', sub: 'Protegé tu hogar desde $2.500/mes' },
];
let _bannerIdx = 0, _bannerTimer = null, _bannerPaused = false;

function renderBannerHome() {
  const el = document.getElementById('banner-carousel');
  if (!el) return;
  const slides = _bannerSlides.map(s => `
    <div class="banner-slide" style="background:${s.bg}">
      <div class="banner-slide-text">
        <strong>${s.title.replace('\n','<br>')}</strong>
        <small>${s.sub}</small>
      </div>
      <div class="banner-slide-icon">${s.icon}</div>
    </div>`).join('');
  const dots = _bannerSlides.map((_,i) =>
    `<span class="banner-dot${i===0?' active':''}" onclick="_goToBannerSlide(${i})"></span>`).join('');
  el.innerHTML = `
    <div class="banner-slides-wrap" id="banner-slides-wrap">${slides}</div>
    <button class="banner-nav banner-prev" onclick="_bannerPrev()">&#8249;</button>
    <button class="banner-nav banner-next" onclick="_bannerNext()">&#8250;</button>
    <div class="banner-dots">${dots}</div>
    <div class="banner-pause-hint" id="banner-pause-hint"></div>`;
  el.addEventListener('mousedown', _bannerHoldStart);
  el.addEventListener('touchstart', _bannerHoldStart, { passive: true });
  el.addEventListener('mouseup', _bannerHoldEnd);
  el.addEventListener('mouseleave', _bannerHoldEnd);
  el.addEventListener('touchend', _bannerHoldEnd);
  if (_bannerTimer) clearInterval(_bannerTimer);
  _bannerIdx = 0;
  _bannerPaused = false;
  _bannerTimer = setInterval(() => { if (!_bannerPaused) _goToBannerSlide((_bannerIdx + 1) % _bannerSlides.length); }, 10000);
}

function _goToBannerSlide(idx) {
  _bannerIdx = idx;
  const w = document.getElementById('banner-slides-wrap');
  if (w) w.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d,i) => d.classList.toggle('active', i === idx));
}
function _bannerPrev() { _goToBannerSlide((_bannerIdx - 1 + _bannerSlides.length) % _bannerSlides.length); }
function _bannerNext() { _goToBannerSlide((_bannerIdx + 1) % _bannerSlides.length); }

let _holdTimeout = null;
function _bannerHoldStart() {
  _holdTimeout = setTimeout(() => {
    _bannerPaused = true;
    const hint = document.getElementById('banner-pause-hint');
    if (hint) { hint.textContent = '⏸ Pausado'; hint.classList.add('visible'); }
  }, 400);
}
function _bannerHoldEnd() {
  clearTimeout(_holdTimeout);
  if (_bannerPaused) {
    _bannerPaused = false;
    const hint = document.getElementById('banner-pause-hint');
    if (hint) hint.classList.remove('visible');
  }
}

function _getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function cargarHome() {
  if (!state.token) { go('login'); return; }
  // Saludo personalizado
  const helloEl = document.getElementById('home-greeting-hello');
  const nameEl  = document.getElementById('home-greeting-name');
  if (helloEl) helloEl.textContent = _getGreeting();
  if (nameEl)  nameEl.textContent  = state.nombre ? `Hola, ${state.nombre}` : 'FIXIT';
  // Barra de ubicación
  const ubic = state.ubicacionActual || localStorage.getItem('fixit_ubicacion') || '';
  const bar = document.getElementById('home-ubicacion-bar');
  const val = document.getElementById('home-ubicacion-value');
  if (ubic) {
    val.textContent = ubic;
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
  renderBannerHome();
  renderCategoriasHome();
  renderSugerenciasHome();
}

function renderCategoriasHome() {
  const config = [
    { tipo: 'Electrodomestico', label: 'Electrodomésticos', img: '/img/Electrodomesticos.webp' },
    { tipo: 'Vehiculo',         label: 'Vehículos',          img: '/img/Vehiculo.jpg' },
    { tipo: 'Electronica',      label: 'Electrónica',        img: '/img/Electronica.png' },
    { tipo: 'Hogar',            label: 'Hogar',              icon: '🏠' },
  ];
  document.getElementById('cats-scroll').innerHTML = config.map(c => `
    <div class="cat-item" onclick="App.irSolicitudRapida('${c.tipo}')">
      <div class="cat-img-wrap">
        ${c.icon
          ? `<span class="cat-item-icon">${c.icon}</span>`
          : `<img src="${c.img}" class="cat-img cat-img-${c.tipo.toLowerCase()}" alt="${c.label}" onerror="this.style.display='none';this.parentElement.style.background='#f0f0f0'"/>`
        }
      </div>
      <span class="cat-pill-label">${c.label}</span>
    </div>`).join('');
}

function renderSugerenciasHome() {
  const cards = [
    { bg:'#f0f4ff', icon:'📖', label:'Tutorial',    title:'Cómo usar FIXIT',                   fn:"App.mostrarToast('Guía próximamente')" },
    { bg:'#fff0f6', icon:'🆕', label:'Novedades',   title:'Chat y notificaciones en tiempo real', fn:"App.mostrarToast('Versión 2.0')" },
    { bg:'#f0fbf4', icon:'🛡️', label:'Protección', title:'Seguro de Hogar desde $2.500/mes',   fn:"App.go('notificaciones')" },
    { bg:'#fffbf0', icon:'⭐', label:'Premium',     title:'FIXIT Pro — técnicos verificados',   fn:"App.go('notificaciones')" },
  ];
  document.getElementById('sug-scroll').innerHTML = cards.map(c => `
    <div class="sug-card" onclick="${c.fn}">
      <div class="sug-card-top" style="background:${c.bg}">${c.icon}</div>
      <div class="sug-card-body">
        <small>${c.label}</small>
        <strong>${c.title}</strong>
      </div>
    </div>`).join('');
}

// ==================== SEARCH ====================
async function initSearch() {
  const posadas = [-27.3671, -55.8961];
  if (!state.map) {
    state.map = L.map('map').setView(posadas, 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(state.map);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => state.map.setView([pos.coords.latitude, pos.coords.longitude], 13),
        () => {},
        { timeout: 5000 }
      );
    }
  }
  try {
    const lista = await api('GET', '/api/tecnicos');
    renderTecnicosList(lista);
    const conCoords = lista.filter(t => t.latitud && t.longitud);
    conCoords.forEach(t => {
      const inicial = (t.nombre || '?')[0].toUpperCase();
      const icon = L.divIcon({
        className: '',
        html: `<div class="tec-sol-marker"><div class="tec-sol-marker-avatar">${inicial}</div></div>`,
        iconSize: [36, 50], iconAnchor: [18, 50]
      });
      L.marker([t.latitud, t.longitud], { icon })
        .addTo(state.map)
        .bindPopup(`<b>${t.nombre} ${t.apellido}</b><br>${t.especialidades || ''}`);
    });
    if (conCoords.length > 1) {
      state.map.fitBounds(L.latLngBounds(conCoords.map(t => [t.latitud, t.longitud])), { padding: [50, 50], maxZoom: 14 });
    }
  } catch (e) { mostrarToast('Error cargando el mapa'); }
}

function renderTecnicosList(lista) {
  document.getElementById('result-count').textContent = lista.length + ' resultado' + (lista.length !== 1 ? 's' : '');
  const emojis = ['👩‍🔧','👨‍🔧','🧑‍🔧','👩‍💻','👨‍💻'];
  document.getElementById('tecnicos-list').innerHTML = lista.length ? lista.map((t, i) => `
    <div class="tecnico-card" onclick="App.verTecnico(${encodeObj(t)})">
      <div class="tecnico-card-avatar">${emojis[i % emojis.length]}</div>
      <div class="tecnico-card-info">
        <h3>${t.nombre} ${t.apellido}</h3>
        <div class="stars">${renderStarsText(t.rating)}</div>
        <p>${t.especialidades || 'Técnico general'}</p>
      </div>
    </div>
  `).join('') : '<div class="empty-state"><span class="emoji">🔍</span><p>No se encontraron técnicos</p></div>';
}

// ==================== TECNICO DETALLE ====================
async function renderTecnicoDetalle(tec) {
  document.getElementById('tec-header-nombre').textContent = tec.nombre;
  document.getElementById('tec-nombre').textContent = tec.nombre + ' ' + tec.apellido;
  document.getElementById('tec-stars').innerHTML = renderStarsFull(tec.rating);
  document.getElementById('tec-reviews').textContent = tec.totalReviews + ' reseñas';
  document.getElementById('tec-especialidades').textContent = tec.especialidades || '-';
  document.getElementById('tec-disponibilidad').textContent = tec.disponibilidad ? '✅ Disponible' : '❌ No disponible';
  try {
    const data = await api('GET', '/api/calificaciones/usuario/' + tec.idUsuario);
    document.getElementById('tec-calificaciones').innerHTML = data.calificaciones.length
      ? data.calificaciones.map(c => `
        <div class="calificacion-card">
          <div class="stars">${renderStarsFull(c.estrellas)}</div>
          <p>${c.opinion || ''}</p>
          <small>${c.autor} · ${formatFecha(c.fecha)}</small>
        </div>`).join('')
      : '<p class="text-muted" style="padding:10px">Sin reseñas aún</p>';
  } catch (e) {}
}

// ==================== SOLICITUDES ====================
async function cargarMisSolicitudes() {
  const container = document.getElementById('mis-solicitudes-list');
  _setAvatares();
  const wrench = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  const subStatus = { 'Pendiente': 'Esperando oferta de técnico', 'En proceso': 'Trabajo en progreso' };
  try {
    const lista = await api('GET', '/api/solicitudes/mis-solicitudes');
    if (!lista.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-title">Sin solicitudes aún</div><div class="empty-state-sub">Buscá un técnico y solicitá una reparación para verla acá.</div><button type="button" class="empty-state-cta" onclick="App.irSolicitudRapida()">Solicitar reparación</button></div>';
      return;
    }
    const pendientes = lista.filter(s => s.estado !== 'Finalizada' && s.estado !== 'Cancelada');
    const anteriores = lista.filter(s => s.estado === 'Finalizada' || s.estado === 'Cancelada');
    let html = '';
    if (pendientes.length) {
      html += `<div class="msol-section">
        <div class="msol-wrap">
          <div class="msol-section-title">Actualmente</div>
          ${pendientes.map(s => `
            <div class="msol-card" onclick="App.verSolicitud(${s.id})">
              <div class="msol-card-icon">${wrench}</div>
              <div class="msol-card-content">
                <div class="msol-card-top">
                  <span class="msol-card-estado">${s.estado}</span>
                  <span class="msol-card-substatus">${subStatus[s.estado] || ''}</span>
                </div>
                <div class="msol-card-desc">${s.detalles || s.categoria.nombre}</div>
                <small class="msol-card-date">${formatFecha(s.fechaSolicitud)}</small>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
    }
    if (anteriores.length) {
      html += `<div class="msol-section">
        <div class="msol-wrap">
          <div class="msol-section-title">Solicitudes anteriores</div>
          <div class="msol-section-body--list">
            ${anteriores.map(s => `
              <div class="msol-row" onclick="App.verSolicitud(${s.id})">
                <div class="msol-row-icon">${wrench}</div>
                <div class="msol-row-content">
                  <div class="msol-row-title">${s.tecnicoNombre || 'Sin técnico asignado'}</div>
                  <div class="msol-row-desc">${s.detalles || s.categoria.nombre}</div>
                  <small class="msol-row-date">${formatFecha(s.fechaSolicitud)}</small>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }
    container.innerHTML = html;
  } catch (e) { mostrarToast('Error al cargar solicitudes'); }
}

async function cargarSolicitudesTecnico() {
  await tecnicoTab('pendientes');
}

async function tecnicoTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');

  const list = document.getElementById('solicitudes-tecnico-list');
  list.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  try {
    if (tab === 'pendientes') {
      const lista = await api('GET', '/api/solicitudes/pendientes');
      list.innerHTML = lista.length
        ? lista.map(s => `
          <div class="solicitud-card" onclick="App.verSolicitud(${s.id})">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h4>${s.categoria.nombre} · #${String(s.id).padStart(5,'0')}</h4>
              <span class="badge badge-pendiente">Pendiente</span>
            </div>
            <p>${s.detalles || ''}</p>
            <p class="text-muted">📍 ${s.ubicacion || 'Sin ubicación'}</p>
            <small class="text-muted">${s.cliente.nombre} ${s.cliente.apellido} · ${formatFecha(s.fechaSolicitud)}</small>
          </div>`).join('')
        : '<div class="empty-state"><span class="emoji">📋</span><p>No hay solicitudes pendientes</p></div>';
    } else {
      const lista = await api('GET', '/api/solicitudes/mis-trabajos');
      list.innerHTML = lista.length
        ? lista.map(s => `
          <div class="solicitud-card" onclick="App.verSolicitud(${s.id})">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h4>${s.categoria.nombre} · #${String(s.id).padStart(5,'0')}</h4>
              <span class="badge ${badgeClass(s.estado)}">${s.estado}</span>
            </div>
            <p>${s.detalles || ''}</p>
            <p class="text-muted">👤 ${s.cliente.nombre} ${s.cliente.apellido}</p>
            <small class="text-muted">${formatFecha(s.fechaSolicitud)}</small>
          </div>`).join('')
        : '<div class="empty-state"><span class="emoji">🔧</span><p>No tenés trabajos aún</p></div>';
    }
  } catch (e) { mostrarToast('Error al cargar'); }
}

function sdetToggleOrden() {
  state.sdetOrden = state.sdetOrden === 'calificacion' ? 'precio' : 'calificacion';
  const btn = document.getElementById('sdet-btn-ordenar');
  if (btn) btn.classList.toggle('active', true);
  const sol = state.solicitudActual;
  if (!sol) return;
  api('GET', '/api/ofertas/solicitud/' + sol.id).then(ofertas => _renderOfertas(sol, ofertas));
}

function _renderStars(rating) {
  const r = Math.max(0, Math.min(5, rating || 0));
  const pts = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
  const rKey = Math.round(r * 100);
  return Array.from({length: 5}, (_, i) => {
    const fill = Math.max(0, Math.min(1, r - i));
    if (fill >= 1) {
      return `<svg width="17" height="17" viewBox="0 0 24 24"><polygon points="${pts}" fill="#1a1a1a"/></svg>`;
    }
    if (fill <= 0) {
      return `<svg width="17" height="17" viewBox="0 0 24 24"><polygon points="${pts}" fill="#d4d4d4"/></svg>`;
    }
    const w = (fill * 24).toFixed(3);
    const uid = `sr${i}_${rKey}`;
    return `<svg width="17" height="17" viewBox="0 0 24 24"><defs><clipPath id="${uid}"><rect x="0" y="0" width="${w}" height="24"/></clipPath></defs><polygon points="${pts}" fill="#d4d4d4"/><polygon points="${pts}" fill="#1a1a1a" clip-path="url(#${uid})"/></svg>`;
  }).join('');
}

function _renderOfertaCard(o, sol, esTecnico) {
  const inicial = (o.tecnico.nombre||'?')[0].toUpperCase();
  const modalidadLabel = o.modalidad === 'Presencial' ? 'A domicilio' : 'En taller';
  const precio = '$' + Number(o.precio).toLocaleString('es-AR');
  const servicios = o.serviciosCompletados || 0;
  const rating = o.calificacionPromedio || 5.0;
  const ratingFmt = Number(rating).toFixed(2);
  const nombre = `${o.tecnico.nombre} ${o.tecnico.apellido}`;
  const badge = o.estado === 'Aceptada' ? `<div><span class="odet-badge-aceptada">Aceptada</span></div>` :
                o.estado === 'Rechazada' ? `<div><span class="odet-badge-rechazada">Rechazada</span></div>` : '';

  return `<div class="odet-card" onclick="abrirOfertaDetail(${o.id})">
    <div class="odet-stars-row"><div class="odet-stars">${_renderStars(rating)}</div><span class="odet-rating-val">${ratingFmt}</span></div>
    <div class="odet-services">${servicios} servicio${servicios!==1?'s':''}</div>
    <div class="odet-name">${nombre}</div>
    <div class="odet-footer">
      <div class="odet-avatar">${inicial}</div>
      <div class="odet-meta">
        <span class="odet-modalidad-label">${modalidadLabel}</span>
        <span class="odet-precio">${precio}</span>
      </div>
    </div>
    ${badge}
  </div>`;
}

function abrirOfertaDetail(ofertaId) {
  const sol = state.solicitudActual;
  if (!sol) return;
  api('GET', '/api/ofertas/solicitud/' + sol.id).then(ofertas => {
    const o = ofertas.find(x => x.id === ofertaId);
    if (!o) return;
    const esTecnico = state.tipo === 'tecnico';
    const inicial = (o.tecnico.nombre||'?')[0].toUpperCase();
    const modalidadLabel = o.modalidad === 'Presencial' ? 'A domicilio' : 'En taller';
    const modalidadDesc = o.modalidad === 'Presencial' ? 'El técnico se dirige a tu domicilio' : 'El producto debe enviarse al taller';
    const precioServicio = Number(o.precio);
    const precioTransporte = Number(o.precioTransporte || 0);
    const precioTotal = precioServicio + precioTransporte;
    const fmtPrecio = n => '$' + n.toLocaleString('es-AR');
    const servicios = o.serviciosCompletados || 0;
    const rating = o.calificacionPromedio || 5.0;
    const ratingFmt = Number(rating).toFixed(2);
    const nombre = `${o.tecnico.nombre} ${o.tecnico.apellido}`;
    const esp = o.tecnico.especialidades || '';
    const tiempo = o.tiempoEstimado || '—';
    const garantia = o.garantiaMeses > 0 ? `Incluye garantía de ${o.garantiaMeses} mes${o.garantiaMeses > 1 ? 'es' : ''}` : 'Sin garantía';
    const ubicTecnico = o.tecnicoUbicacion || '';
    const ubicOferta = o.modalidad === 'Presencial' ? (sol.ubicacion || '') : ubicTecnico;
    const desc = o.descripcionOferta || '';

    const badge = o.estado === 'Aceptada' ? `<span class="odet-badge-aceptada" style="font-size:13px;padding:5px 12px;display:inline-block;margin-bottom:8px">Aceptada</span>` :
                  o.estado === 'Rechazada' ? `<span class="odet-badge-rechazada" style="font-size:13px;padding:5px 12px;display:inline-block;margin-bottom:8px">Rechazada</span>` : '';

    const promociones = 0;

    let actionBtns = '';
    if (!esTecnico && o.estado === 'Pendiente') {
      actionBtns = `
        <div class="ofd-action-btns">
          <button type="button" class="ofd-btn-aceptar" onclick="App.aceptarOferta(${o.id},${o.precio},'${o.modalidad}','${tiempo}'); cerrarOfertaDetail()">Seleccionar Oferta</button>
          <button type="button" class="ofd-btn-rechazar" onclick="App.rechazarOferta(${o.id}); cerrarOfertaDetail()">Rechazar oferta</button>
        </div>`;
    } else if (!esTecnico && o.estado === 'Aceptada') {
      actionBtns = `<div class="ofd-action-btns"><button type="button" class="ofd-btn-chat" onclick="App.abrirChat(${o.tecnico.idUsuario},'${nombre}'); cerrarOfertaDetail()">💬 Chat con el técnico</button></div>`;
    } else if (esTecnico && o.estado === 'Aceptada') {
      actionBtns = `<div class="ofd-action-btns"><button type="button" class="ofd-btn-chat" onclick="App.abrirChat(${sol.cliente.idUsuario},'${sol.cliente.nombre} ${sol.cliente.apellido}'); cerrarOfertaDetail()">💬 Chat con el cliente</button></div>`;
    }

    document.getElementById('ofd-body').innerHTML = `
      <div class="ofd-profile-card ofd-profile-card-clickable" onclick="abrirCalificacionesTecnico(${o.tecnico.idUsuario},'${nombre.replace(/'/g,"\\'")}')">
        <div class="ofd-avatar">${inicial}</div>
        <div class="ofd-profile-info">
          <div class="ofd-profile-name">${nombre}</div>
          <div class="ofd-profile-esp">${esp}</div>
          ${ubicTecnico ? `<div class="ofd-profile-esp" style="margin-top:-10px">${ubicTecnico}</div>` : ''}
          ${badge}
          <div class="ofd-cal-label">Calificación</div>
          <div class="ofd-stars-row">${_renderStars(rating)}<span class="ofd-rating-num">${ratingFmt}</span></div>
          <div class="ofd-servicios">${servicios} Reparaciones en la app</div>
        </div>
      </div>
      <div class="ofd-details-card">
        <div class="ofd-details-title">Detalles de la oferta</div>
        <div class="ofd-detail-group">
          <div class="ofd-detail-group-title">Modalidad</div>
          <div class="ofd-detail-group-val">${modalidadDesc}</div>
        </div>
        ${ubicOferta ? `<div class="ofd-detail-group"><div class="ofd-detail-group-title">Ubicación</div><div class="ofd-detail-group-val">${ubicOferta}</div></div>` : ''}
        <div class="ofd-detail-group">
          <div class="ofd-detail-group-title">Garantía</div>
          <div class="ofd-detail-group-val">${garantia}</div>
        </div>
        ${desc ? `<div class="ofd-detail-group"><div class="ofd-detail-group-title">Descripción</div><div class="ofd-detail-group-val">${desc}</div></div>` : ''}
        <div class="ofd-detail-group">
          <div class="ofd-detail-group-title">Precio</div>
          <div class="ofd-precio-row"><span>Inicial</span><span>${fmtPrecio(precioServicio)}</span></div>
          <div class="ofd-precio-row"><span>Total de transporte</span><span>${precioTransporte === 0 ? 'Gratis' : fmtPrecio(precioTransporte)}</span></div>
          <div class="ofd-precio-row"><span>Promociones</span><span>${promociones === 0 ? '$0' : '-' + fmtPrecio(promociones)}</span></div>
          <div class="ofd-precio-row total"><span>Total</span><span>${fmtPrecio(precioTotal - promociones)}</span></div>
        </div>
        ${actionBtns}
      </div>
    `;

    document.getElementById('ofd-footer').innerHTML = '';

    go('oferta-detail');
  }).catch(() => mostrarToast('Error al cargar oferta'));
}

function cerrarOfertaDetail() {
  go('solicitud-detail');
}

function cancelarAceptarOferta() {
  document.getElementById('modal-aceptar-oferta').style.display = 'none';
  state._pendingAceptar = null;
}

async function confirmarAceptarOferta() {
  document.getElementById('modal-aceptar-oferta').style.display = 'none';
  const { idOferta, precio, modalidad, tiempoEstimado } = state._pendingAceptar || {};
  state._pendingAceptar = null;
  if (!idOferta) return;
  try {
    loading(true);
    await api('PUT', '/api/ofertas/' + idOferta + '/aceptar');
    // Recargar la oferta completa para tener todos los datos
    const sol = state.solicitudActual;
    const ofertas = await api('GET', '/api/ofertas/solicitud/' + sol.id);
    const o = ofertas.find(x => x.id === idOferta);
    if (o) renderServicio(o, sol);
    go('servicio');
  } catch (e) { mostrarToast(e.message); }
  finally { loading(false); }
}

async function renderServicio(o, sol) {
  state._servicioActual = { ofertaId: o.id, solId: sol.id };

  const esTecnico = state.tipo === 'tecnico';

  // La tarjeta muestra el OTRO: si soy técnico, muestro al cliente; si soy cliente, muestro al técnico
  const cardNombre = esTecnico
    ? `${sol.cliente?.nombre || ''} ${sol.cliente?.apellido || ''}`.trim()
    : `${o.tecnico.nombre} ${o.tecnico.apellido}`;
  const cardInicial = (cardNombre || '?')[0].toUpperCase();
  const cardSub     = esTecnico ? 'Cliente' : (o.tecnico.especialidades || '');
  const cardNombreEsc = cardNombre.replace(/'/g, "\\'");

  // Stats de la tarjeta
  let cardRating = esTecnico ? 5.0 : (o.calificacionPromedio || 5.0);
  let cardServ   = esTecnico ? 0   : (o.serviciosCompletados || 0);
  let cardServLabel = esTecnico ? 'solicitudes' : 'reparaciones';
  if (esTecnico && sol.cliente?.idUsuario) {
    try {
      const stats = await api('GET', '/api/solicitudes/cliente/' + sol.cliente.idUsuario + '/stats');
      cardRating = stats.calificacionPromedio || 5.0;
      cardServ   = stats.totalSolicitudes || 0;
    } catch (_) {}
  }

  // Datos del técnico (para chat y otros usos)
  const nombre = `${o.tecnico.nombre} ${o.tecnico.apellido}`;
  const esp = o.tecnico.especialidades || '';
  const rating = o.calificacionPromedio || 5.0;
  const ratingFmt = Number(rating).toFixed(2);
  const servicios = o.serviciosCompletados || 0;
  const idUsuarioTec = o.tecnico.idUsuario;
  const nombreEsc = nombre.replace(/'/g, "\\'");

  const modalidadDesc = o.modalidad === 'Presencial' ? 'El técnico se dirige a tu domicilio' : 'El producto debe enviarse al taller';
  const precioServicio = Number(o.precio);
  const precioTransporte = Number(o.precioTransporte || 0);
  const precioTotal = precioServicio + precioTransporte;
  const fmt = n => '$' + n.toLocaleString('es-AR');
  const garantia = o.garantiaMeses > 0 ? `Incluye garantía de ${o.garantiaMeses} mes${o.garantiaMeses > 1 ? 'es' : ''}` : 'Sin garantía';
  const ubicTecnico = o.tecnicoUbicacion || '';
  const ubicOferta = o.modalidad === 'Presencial' ? (sol.ubicacion || '') : ubicTecnico;
  const desc = o.descripcionOferta || '';
  const promociones = 0;

  const chatTarget = esTecnico
    ? `${sol.cliente ? sol.cliente.idUsuario : 0},'${sol.cliente ? (sol.cliente.nombre + ' ' + sol.cliente.apellido).replace(/'/g, "\\'") : ''}'`
    : `${idUsuarioTec},'${nombreEsc}'`;

  const finalizarItem = '';

  const iconChat = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  const iconPhone = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.62 4.38 2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const iconDots = `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;

  document.getElementById('srv-body').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:16px">
    <div class="srv-tec-card" ${!esTecnico ? `onclick="abrirCalificacionesTecnico(${idUsuarioTec},'${nombreEsc}')"` : ''}>
      <div class="srv-tec-avatar-lg">${cardInicial}</div>
      <div class="srv-tec-name-lg">${cardNombre}</div>
      ${cardSub ? `<div class="srv-tec-esp-lg">${cardSub}</div>` : ''}
      ${!esTecnico && ubicTecnico ? `<div class="srv-tec-esp-lg">${ubicTecnico}</div>` : ''}
      <div class="srv-tec-rating-row">${_renderStars(cardRating)}<span style="margin-left:6px;font-size:14px;font-weight:700;color:#1a1a1a">${Number(cardRating).toFixed(2)}</span><span style="color:#888;font-size:12px;margin-left:4px">· ${cardServ} ${cardServLabel}</span></div>
      <div class="srv-tac-row" onclick="event.stopPropagation()">
        <button type="button" class="srv-tac-btn" onclick="App.abrirChat(${chatTarget})">${iconChat}<span>Mensaje</span></button>
        <button type="button" class="srv-tac-btn" onclick="mostrarToast('Próximamente')">${iconPhone}<span>Llamar</span></button>
        <div style="position:relative;flex:1">
          <button type="button" class="srv-tac-btn" style="width:100%" onclick="toggleSrvMenu(event)">${iconDots}<span>Más</span></button>
          <div class="srv-menu-dropdown" id="srv-menu-dropdown" style="display:none">
            <button type="button" class="srv-menu-item srv-menu-item-danger" onclick="cancelarServicioActual()">Cancelar servicio</button>
          </div>
        </div>
      </div>
    </div>
    <div class="ofd-details-card">
      <div class="ofd-details-title">Detalles del servicio</div>
      <div class="ofd-detail-group">
        <div class="ofd-detail-group-title">Modalidad</div>
        <div class="ofd-detail-group-val">${modalidadDesc}</div>
      </div>
      ${ubicOferta ? `<div class="ofd-detail-group"><div class="ofd-detail-group-title">Ubicación</div><div class="ofd-detail-group-val">${ubicOferta}</div></div>` : ''}
      <div class="ofd-detail-group">
        <div class="ofd-detail-group-title">Garantía</div>
        <div class="ofd-detail-group-val">${garantia}</div>
      </div>
      ${desc ? `<div class="ofd-detail-group"><div class="ofd-detail-group-title">Descripción</div><div class="ofd-detail-group-val">${desc}</div></div>` : ''}
      <div class="ofd-detail-group">
        <div class="ofd-detail-group-title">Precio</div>
        <div class="ofd-precio-row"><span>Inicial</span><span>${fmt(precioServicio)}</span></div>
        <div class="ofd-precio-row"><span>Total de transporte</span><span>${precioTransporte === 0 ? 'Gratis' : fmt(precioTransporte)}</span></div>
        <div class="ofd-precio-row"><span>Promociones</span><span>${promociones === 0 ? '$0' : '-' + fmt(promociones)}</span></div>
        <div class="ofd-precio-row total"><span>Total</span><span>${fmt(precioTotal - promociones)}</span></div>
      </div>
    </div>
  </div>
  `;

  // Update service progress bar
  const steps = ['srv-step-0','srv-step-1','srv-step-2','srv-step-3'];
  const fillEl = document.getElementById('srv-steps-fill');
  const stateMap = { 'En proceso': 1, 'PendienteConfirmacion': 2, 'Finalizada': 3 };
  const activeStep = stateMap[sol.estado] ?? 1;
  const fillPct = [0, 33, 67, 100][activeStep] ?? 33;
  if (fillEl) fillEl.style.width = fillPct + '%';
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('done','active');
    if (i < activeStep) { el.classList.add('done'); el.querySelector('.srv-step-dot').textContent = '✓'; }
    else if (i === activeStep) el.classList.add('active');
  });

  const srvFooter = document.getElementById('srv-footer');
  srvFooter.style.display = 'block';
  if (!esTecnico) {
    if (sol.estado === 'PendienteConfirmacion') {
      srvFooter.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin-bottom:10px;text-align:center;font-size:13px;color:#16a34a">
          ✅ El técnico marcó el servicio como finalizado
        </div>
        <button type="button" class="srv-btn-finalizar" onclick="App.finalizarServicio(${sol.id})">Confirmar finalización</button>
        <button type="button" class="srv-btn-soporte" onclick="mostrarToast('Soporte próximamente disponible')">Contactar soporte</button>`;
    } else {
      srvFooter.innerHTML = '';
      srvFooter.style.display = 'none';
    }
  } else {
    if (sol.estado === 'En proceso') {
      srvFooter.innerHTML = `<button type="button" class="srv-btn-finalizar" onclick="tecMarcarFinalizado(${sol.id})">Marcar servicio como finalizado</button>`;
    } else if (sol.estado === 'PendienteConfirmacion') {
      srvFooter.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;color:#888;font-size:13px"><div class="spinner-sm"></div>Esperando confirmación del cliente…</div>`;
    } else {
      srvFooter.innerHTML = '';
      srvFooter.style.display = 'none';
    }
  }
}

async function tecMarcarFinalizado(solId) {
  if (!confirm('¿Marcar este servicio como finalizado? El cliente deberá confirmar.')) return;
  try {
    loading(true);
    await api('PUT', '/api/solicitudes/' + solId + '/tecnico-finalizo');
    mostrarToast('✅ Servicio marcado como finalizado');
    App.verSolicitud(solId);
  } catch(e) { mostrarToast(e.message); }
  finally { loading(false); }
}

function cancelarServicioActual() {
  const d = document.getElementById('srv-menu-dropdown');
  if (d) d.style.display = 'none';
  if (!state._servicioActual?.ofertaId) return;
  document.getElementById('modal-cancelar-servicio').style.display = 'flex';
}

async function confirmarCancelarServicio() {
  document.getElementById('modal-cancelar-servicio').style.display = 'none';
  const { ofertaId, solId } = state._servicioActual || {};
  if (!ofertaId) return;
  cancelarServicio(ofertaId, solId);
}

function toggleSrvMenu(e) {
  e.stopPropagation();
  const d = document.getElementById('srv-menu-dropdown');
  if (d) d.style.display = d.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener('click', function() {
  const d = document.getElementById('srv-menu-dropdown');
  if (d) d.style.display = 'none';
});

async function cancelarServicio(ofertaId, solId) {
  try {
    loading(true);
    await api('PUT', '/api/ofertas/' + ofertaId + '/cancelar');
    mostrarToast('Servicio cancelado');
    await App.verSolicitud(solId);
  } catch(e) { mostrarToast(e.message); }
  finally { loading(false); }
}

async function abrirCalificacionesTecnico(idUsuario, nombre) {
  document.getElementById('tecnico-cals-titulo').textContent = nombre;
  document.getElementById('tecnico-cals-body').innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  go('tecnico-cals');
  try {
    const data = await api('GET', '/api/calificaciones/usuario/' + idUsuario);
    const cals = data.calificaciones || [];
    if (!cals.length) {
      document.getElementById('tecnico-cals-body').innerHTML = '<div class="tcal-empty">Sin calificaciones aún</div>';
      return;
    }
    const prom = data.total > 0 ? parseFloat(data.promedio) : 0;
    const promFmt = prom.toFixed(2);
    const resumen = `<div class="tcal-resumen">
      <div class="tcal-resumen-stars">${_renderStars(prom)}</div>
      <span class="tcal-resumen-num">${promFmt}</span>
      <span class="tcal-resumen-total">${data.total} reseña${data.total !== 1 ? 's' : ''}</span>
    </div>`;
    const inicialTec = (nombre || '?')[0].toUpperCase();
    document.getElementById('tecnico-cals-body').innerHTML = resumen + cals.map(c => `
        <div class="tcal-card">
          <div class="tcal-card-header">
            <div class="tcal-avatar">${inicialTec}</div>
            <div class="tcal-autor-wrap">
              <div class="tcal-autor-name"><strong>${nombre}</strong> ha sido calificado</div>
              <div class="tcal-fecha">${formatFecha(c.fecha)}</div>
            </div>
          </div>
          <div class="tcal-stars">${_renderStars(c.estrellas)}</div>
          ${c.opinion ? `<div class="tcal-opinion">${c.opinion}</div>` : ''}
        </div>`).join('');
  } catch(e) {
    document.getElementById('tecnico-cals-body').innerHTML = '<div class="tcal-empty">Error al cargar</div>';
  }
}

function cerrarCalificacionesTecnico() {
  go('oferta-detail');
}

function ofModalidadChange() {
  const modal = v('of-modalidad');
  const wrap = document.getElementById('of-transporte-wrap');
  if (wrap) wrap.style.display = modal === 'Remoto' ? '' : 'none';
}

function _renderOfertas(sol, ofertas) {
  const esTecnico = state.tipo === 'tecnico';

  if (esTecnico) {
    // El técnico solo ve su propia oferta si ya la envió
    const miOferta = ofertas.find(o => o.tecnico && o.tecnico.idUsuario === state.userId);
    const listEl = document.getElementById('sol-ofertas-list');
    if (miOferta) {
      const colorEstado = { Pendiente: '#f59e0b', Aceptada: '#22c55e', Rechazada: '#ef4444' };
      const col = colorEstado[miOferta.estado] || '#888';
      listEl.innerHTML = `
        <div style="background:#f9f9f9;border-radius:12px;padding:14px 16px;margin-bottom:12px;border:1.5px solid ${col}22">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:700;font-size:15px">Tu oferta enviada</span>
            <span style="background:${col}18;color:${col};font-size:12px;font-weight:700;padding:3px 10px;border-radius:100px">${miOferta.estado}</span>
          </div>
          <div style="font-size:14px;color:#333;display:flex;flex-direction:column;gap:4px">
            <span>💰 $${Number(miOferta.precio).toLocaleString('es-AR')}</span>
            <span>📋 ${miOferta.modalidad || '—'}</span>
            <span>⏱ ${miOferta.tiempoEstimado || '—'}</span>
            ${miOferta.garantiaMeses ? `<span>🛡 ${miOferta.garantiaMeses} meses de garantía</span>` : ''}
            ${miOferta.descripcionOferta ? `<span style="color:#666">"${miOferta.descripcionOferta}"</span>` : ''}
          </div>
        </div>`;
    } else {
      listEl.innerHTML = '';
    }
    // Ocultar badge de cantidad y botón ordenar
    document.getElementById('sdet-count').textContent = '';
    document.getElementById('sdet-count-sheet').textContent = '';
    const btnOrdenar = document.getElementById('sdet-btn-ordenar');
    if (btnOrdenar) btnOrdenar.style.display = 'none';
    return;
  }

  const ordenadas = [...ofertas].sort((a,b) =>
    state.sdetOrden === 'precio'
      ? Number(a.precio) - Number(b.precio)
      : (b.calificacionPromedio||5) - (a.calificacionPromedio||5)
  );
  document.getElementById('sol-ofertas-list').innerHTML = ordenadas.length
    ? ordenadas.map(o => _renderOfertaCard(o, sol, esTecnico)).join('')
    : '<div class="empty-state"><span class="emoji">💼</span><p>Sin ofertas aún</p></div>';
}

const _geocodeCache = {};
async function _geocodeWithFallback(ubicacion) {
  const cacheKey = ubicacion.toLowerCase().trim();
  if (_geocodeCache[cacheKey]) return _geocodeCache[cacheKey];
  async function tryQuery(q) {
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && data.length) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch(e) {}
    return null;
  }
  // 1. Query completo
  let c = await tryQuery(ubicacion);
  if (c) { _geocodeCache[cacheKey] = c; return c; }
  // 2. Desde la primera coma en adelante (ciudad + provincia)
  const parts = ubicacion.split(',');
  if (parts.length > 1) {
    c = await tryQuery(parts.slice(1).join(',').trim());
    if (c) { _geocodeCache[cacheKey] = c; return c; }
  }
  // 3. Solo las últimas dos partes
  if (parts.length > 2) {
    c = await tryQuery(parts.slice(-2).join(',').trim());
    if (c) { _geocodeCache[cacheKey] = c; return c; }
  }
  // 4. Solo la última parte
  if (parts.length > 1) {
    c = await tryQuery(parts[parts.length - 1].trim());
    if (c) { _geocodeCache[cacheKey] = c; return c; }
  }
  return null;
}

async function _initSdetMap(sol, ofertas) {
  const mapEl = document.getElementById('sdet-map');
  if (!mapEl) return;
  if (state.sdetMap) { state.sdetMap.remove(); state.sdetMap = null; }
  delete mapEl._leaflet_id;
  mapEl.innerHTML = '';
  mapEl.style.display = '';

  if (!sol.ubicacion || sol.ubicacion === 'Sin ubicación') {
    mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px">Sin ubicación</div>';
    return;
  }

  const center = (sol.latitud && sol.longitud)
    ? [sol.latitud, sol.longitud]
    : await _geocodeWithFallback(sol.ubicacion);

  if (!center) {
    mapEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;font-size:13px">Ubicación no disponible</div>';
    return;
  }

  const map = L.map(mapEl, { zoomControl:true, attributionControl:false, dragging:true, scrollWheelZoom:true, doubleClickZoom:true, touchZoom:true });
  state.sdetMap = map;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map);
  map.setView(center, 14);

  const searchIcon = L.divIcon({ className:'', html:`<div class="sdet-map-marker"><div class="sdet-map-pulse" style="animation:map-ripple 2.4s linear 0s infinite"></div><div class="sdet-map-pulse" style="animation:map-ripple 2.4s linear -0.8s infinite"></div><div class="sdet-map-pulse" style="animation:map-ripple 2.4s linear -1.6s infinite"></div><div class="sdet-map-center"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div></div>`, iconSize:[80,80], iconAnchor:[40,40] });
  L.marker(center, {icon: searchIcon}).addTo(map);

  await Promise.all(ofertas.map(async (o, i) => {
    const inicial = (o.tecnico.nombre||'?')[0].toUpperCase();
    const techIcon = L.divIcon({ className:'', html:`<div class="sdet-tech-marker">${inicial}</div>`, iconSize:[32,32], iconAnchor:[16,32] });

    let pos = null;
    if (o.tecnicoUbicacion) {
      pos = await _geocodeWithFallback(o.tecnicoUbicacion).catch(() => null);
    }
    if (!pos) {
      const angle = (i / Math.max(ofertas.length, 1)) * 2 * Math.PI;
      const r = 0.006 + (i % 3) * 0.003;
      pos = [center[0] + Math.sin(angle) * r, center[1] + Math.cos(angle) * r];
    }

    L.marker(pos, { icon: techIcon })
      .addTo(map)
      .on('click', () => abrirOfertaDetail(o.id));
  }));

  // ResizeObserver: corrige el tamaño automáticamente cuando el contenedor cambia
  if (state.sdetMapObserver) { state.sdetMapObserver.disconnect(); state.sdetMapObserver = null; }
  if (typeof ResizeObserver !== 'undefined') {
    state.sdetMapObserver = new ResizeObserver(() => { if (state.sdetMap) state.sdetMap.invalidateSize(); });
    state.sdetMapObserver.observe(mapEl);
  }
  // Fallback para navegadores sin ResizeObserver
  [200, 500].forEach(ms => setTimeout(() => { if (state.sdetMap) state.sdetMap.invalidateSize(); }, ms));
}

function _renderInfoCard(sol) {
  const p = _parseDetalles(sol.detalles);
  const esPendiente = sol.estado === 'Pendiente';
  const estadoColor = { Pendiente: '#f59e0b', 'En proceso': '#3b82f6', Finalizada: '#22c55e', Cancelada: '#ef4444' };
  const color = estadoColor[sol.estado] || '#888';
  const rows = [
    ['Categoría', sol.categoria ? sol.categoria.nombre : '—'],
    ['Tipo', sol.categoria ? sol.categoria.tipo : '—'],
    p.marca   ? ['Marca', p.marca]       : null,
    p.modelo  ? ['Modelo', p.modelo]     : null,
    p.ident   ? ['N° de serie', p.ident] : null,
    p.desc    ? ['Descripción', p.desc]  : null,
    ['Ubicación', sol.ubicacion || 'Sin ubicación'],
  ].filter(Boolean);
  return `
    <div class="sdet-ic-header">
      <span class="sdet-ic-estado" style="background:${color}20;color:${color}">${sol.estado}</span>
      <span class="sdet-ic-fecha">${formatFecha(sol.fechaSolicitud)}</span>
    </div>
    <div class="sdet-ic-rows">
      ${rows.map(([k,v]) => `<div class="sdet-ic-row"><span class="sdet-ic-key">${k}</span><span class="sdet-ic-val">${v}</span></div>`).join('')}
    </div>
    ${esPendiente ? `<button type="button" class="sdet-ic-edit-btn" onclick="abrirEditSolicitud()">✏ Editar solicitud</button>` : ''}
  `;
}

function renderSolicitudDetalle(sol, ofertas) {
  const esTecnico = state.tipo === 'tecnico';
  // Header
  const loc = sol.ubicacion || 'Sin ubicación';
  const sub = sol.detalles ? (sol.detalles.length > 55 ? sol.detalles.slice(0,55)+'…' : sol.detalles) : sol.categoria.nombre;
  document.getElementById('sdet-loc-title').textContent = loc;
  document.getElementById('sdet-loc-sub').textContent = sub;
  // Badge solo visible para clientes
  const badgeTxt = (!esTecnico && ofertas.length) ? String(ofertas.length) : '';
  document.getElementById('sdet-count').textContent = badgeTxt;
  document.getElementById('sdet-count-sheet').textContent = badgeTxt;
  // Pill "Ofertas" visible solo para cliente
  const pill = document.querySelector('.sdet-ofertas-pill');
  if (pill) pill.style.display = esTecnico ? 'none' : '';
  // Info card (pre-render, shown on demand)
  document.getElementById('info-card-body').innerHTML = _renderInfoCard(sol);
  // Ofertas
  _renderOfertas(sol, ofertas);
  // Si técnico ya envió oferta, ocultar el formulario
  const miOferta = esTecnico ? ofertas.find(o => o.tecnico && o.tecnico.idUsuario === state.userId) : null;
  document.getElementById('hacer-oferta-section').style.display =
    esTecnico && sol.estado === 'Pendiente' && !miOferta ? 'block' : 'none';
  // Finalizar / Calificar
  const fin = document.getElementById('btn-finalizar-sol');
  if (!esTecnico && sol.estado==='En proceso') {
    fin.innerHTML = `<button type="button" class="btn-primary" style="background:#22c55e;width:100%" onclick="App.finalizarServicio(${sol.id})">✓ Marcar como finalizado</button>`;
  } else if (sol.estado==='Finalizada') {
    fin.innerHTML = `<button type="button" class="btn-outline" style="width:100%" onclick="App.verificarYCalificar(${sol.id})">⭐ Calificar servicio</button>`;
  } else {
    fin.innerHTML = '';
  }
}

// ==================== EDITAR SOLICITUD ====================
let _editSolFotos = [];

const _IDENT_LABELS = ['Nro de serie', 'Patente', 'Problema', 'N° de paciente'];

function _parseDetalles(detalles) {
  const out = { marca: '', modelo: '', ident: '', desc: '', identKey: '' };
  if (!detalles) return out;
  detalles.split('|').map(p => p.trim()).forEach(part => {
    if (part.startsWith('Marca:')) { out.marca = part.slice(6).trim(); return; }
    if (part.startsWith('Modelo:')) { out.modelo = part.slice(7).trim(); return; }
    if (part.startsWith('Descripción:')) { out.desc = part.slice(12).trim(); return; }
    for (const lbl of _IDENT_LABELS) {
      if (part.startsWith(lbl + ':')) {
        out.ident = part.slice(lbl.length + 1).trim();
        out.identKey = lbl;
        return;
      }
    }
  });
  return out;
}

function abrirEditSolicitud() {
  const sol = state.solicitudActual;
  if (!sol) return;
  if (sol.estado !== 'Pendiente') {
    App.mostrarToast('No podés editar una solicitud ya aceptada');
    return;
  }
  const cfg = (sol.categoria && SOL_CONFIG[sol.categoria.tipo]) || { showMarca: true, showModelo: true, identLabel: 'Nro de serie', identOpcional: true };
  const parsed = _parseDetalles(sol.detalles);
  document.getElementById('edit-sol-marca-wrap').style.display = cfg.showMarca ? '' : 'none';
  document.getElementById('edit-sol-modelo-wrap').style.display = cfg.showModelo ? '' : 'none';
  document.getElementById('edit-sol-ident-label').textContent = cfg.identLabel;
  document.getElementById('edit-sol-ident').placeholder = cfg.identOpcional ? '(opcional)' : '';
  document.getElementById('edit-sol-marca').value = parsed.marca;
  document.getElementById('edit-sol-modelo').value = parsed.modelo;
  document.getElementById('edit-sol-ident').value = parsed.ident;
  document.getElementById('edit-sol-desc').value = parsed.desc;
  _editSolFotos = [];
  editSolRenderFotos();
  cerrarInfoCard();
  document.getElementById('edit-sol-sheet').classList.add('open');
  document.getElementById('edit-sol-backdrop').classList.add('open');
}

function cerrarEditSolicitud() {
  document.getElementById('edit-sol-sheet').classList.remove('open');
  document.getElementById('edit-sol-backdrop').classList.remove('open');
}

App.cancelarSolicitud = async function() {
  const sol = state.solicitudActual;
  if (!sol) return;
  if (!confirm('¿Cancelar esta solicitud? Esta acción no se puede deshacer.')) return;
  try {
    await api('PUT', '/api/solicitudes/' + sol.id + '/cancelar');
    cerrarEditSolicitud();
    App.mostrarToast('Solicitud cancelada');
    App.irSolicitudes();
  } catch (e) {
    App.mostrarToast('No se pudo cancelar la solicitud');
  }
};

function abrirInfoCard() {
  document.getElementById('info-card-sheet').classList.add('open');
  document.getElementById('info-card-backdrop').classList.add('open');
}

function cerrarInfoCard() {
  document.getElementById('info-card-sheet').classList.remove('open');
  document.getElementById('info-card-backdrop').classList.remove('open');
}

function abrirOfertasSheet() {
  const sheet = document.getElementById('ofertas-sheet');
  sheet.style.transform = '';
  sheet.style.transition = '';
  sheet.classList.add('open');
  document.getElementById('ofertas-sheet-backdrop').classList.add('open');
  _initOfertasSheetDrag(sheet);
}

function cerrarOfertasSheet() {
  const sheet = document.getElementById('ofertas-sheet');
  sheet.style.transform = '';
  sheet.style.transition = '';
  sheet.classList.remove('open');
  document.getElementById('ofertas-sheet-backdrop').classList.remove('open');
}

function _initOfertasSheetDrag(sheet) {
  if (sheet._dragInit) return;
  sheet._dragInit = true;
  let startY = 0, currentY = 0, dragging = false;

  sheet.addEventListener('touchstart', e => {
    // Only drag from the drag bar or header area (top 60px of sheet)
    const touchY = e.touches[0].clientY;
    const rect = sheet.getBoundingClientRect();
    if (touchY - rect.top > 60) return;
    startY = touchY;
    dragging = true;
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
    if (delta > 120) {
      cerrarOfertasSheet();
    } else {
      sheet.style.transform = '';
    }
  });
}

function editSolAbrirFotos() {
  document.getElementById('edit-sol-fotos-input').click();
}

function editSolFotosSeleccionadas(input) {
  Array.from(input.files).forEach(f => {
    _editSolFotos.push({ file: f, url: URL.createObjectURL(f) });
  });
  input.value = '';
  editSolRenderFotos();
}

function editSolRenderFotos() {
  const container = document.getElementById('edit-sol-fotos-preview');
  container.innerHTML = _editSolFotos.map((f, i) => `
    <div class="edit-sol-foto-wrap">
      <img src="${f.url}" alt="foto ${i+1}"/>
      <button type="button" class="edit-sol-foto-del" onclick="editSolEliminarFoto(${i})">×</button>
    </div>`).join('');
}

function editSolEliminarFoto(idx) {
  URL.revokeObjectURL(_editSolFotos[idx].url);
  _editSolFotos.splice(idx, 1);
  editSolRenderFotos();
}

async function guardarEdicionSolicitud() {
  const sol = state.solicitudActual;
  if (!sol) return;
  const marca = document.getElementById('edit-sol-marca').value.trim();
  const modelo = document.getElementById('edit-sol-modelo').value.trim();
  const ident = document.getElementById('edit-sol-ident').value.trim();
  const desc = document.getElementById('edit-sol-desc').value.trim();

  const cfg = (sol.categoria && SOL_CONFIG[sol.categoria.tipo]) || { identLabel: 'Nro de serie' };
  const parsed = _parseDetalles(sol.detalles);
  const identLabel = parsed.identKey || cfg.identLabel;
  const tipo = sol.detalles ? (sol.detalles.split('|')[0].startsWith('Tipo:') ? sol.detalles.split('|')[0].slice(5).trim() : '') : '';

  const parts = [];
  if (tipo) parts.push('Tipo: ' + tipo);
  if (marca) parts.push('Marca: ' + marca);
  if (modelo) parts.push('Modelo: ' + modelo);
  if (ident) parts.push(identLabel + ': ' + ident);
  if (desc) parts.push('Descripción: ' + desc);
  const nuevosDetalles = parts.join(' | ');

  const btn = document.querySelector('.edit-sol-save-btn');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const updated = await api('PUT', '/api/solicitudes/' + sol.id, { detalles: nuevosDetalles });
    state.solicitudActual = updated;
    cerrarEditSolicitud();
    App.mostrarToast('Solicitud actualizada');
    const ofertas = await api('GET', '/api/ofertas/solicitud/' + sol.id);
    renderSolicitudDetalle(updated, ofertas);
  } catch(e) {
    App.mostrarToast('Error al guardar');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

// ==================== NOTIFICACIONES ====================
async function cargarNotificaciones() {
  const el = document.getElementById('notif-body');
  el.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  let html = '<div class="notif-section-title">Actividad</div>';

  try {
    if (state.tipo === 'cliente') {
      const solicitudes = await api('GET', '/api/solicitudes/mis-solicitudes');
      const items = [];
      for (const sol of solicitudes.filter(s => s.estado === 'Pendiente')) {
        const ofertas = await api('GET', '/api/ofertas/solicitud/' + sol.id);
        for (const o of ofertas.filter(o => o.estado === 'Pendiente')) {
          items.push({ solicitudId: sol.id, tecnico: o.tecnico.nombre + ' ' + o.tecnico.apellido,
            precio: o.precio, modalidad: o.modalidad });
        }
      }
      if (items.length) {
        html += items.map(n => `
          <div class="notif-item" onclick="App.verSolicitud(${n.solicitudId})">
            <div class="notif-icon">💼</div>
            <div class="notif-info">
              <strong>${n.tecnico} te envió una oferta</strong>
              <small>$${Number(n.precio).toLocaleString('es-AR')} · ${n.modalidad}</small>
            </div>
            <span class="notif-chevron">›</span>
          </div>`).join('');
      } else {
        html += '<div class="empty-state" style="padding:32px 24px"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Todo al día</div><div class="empty-state-sub">Cuando recibas ofertas de técnicos, las verás acá.</div></div>';
      }
    } else {
      const sols = await api('GET', '/api/solicitudes/pendientes');
      if (sols.length) {
        html += sols.slice(0, 5).map(s => `
          <div class="notif-item" onclick="App.verSolicitud(${s.id})">
            <div class="notif-icon">🔧</div>
            <div class="notif-info">
              <strong>Nueva solicitud: ${s.categoria.nombre}</strong>
              <small>${s.detalles || ''} · ${s.ubicacion || 'Sin ubicación'}</small>
            </div>
            <span class="notif-chevron">›</span>
          </div>`).join('');
      } else {
        html += '<div class="empty-state" style="padding:32px 24px"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Sin nuevas solicitudes</div><div class="empty-state-sub">Cuando los clientes publiquen solicitudes, aparecerán acá.</div></div>';
      }
    }
  } catch (e) {
    html += '<div class="empty-state" style="padding:32px 24px"><div class="empty-state-icon">🔔</div><div class="empty-state-title">Sin actividad reciente</div></div>';
  }

  html += `
    <div class="notif-section-title" style="margin-top:8px">Recomendados para vos</div>
    <div class="notif-promo-card" onclick="mostrarToast('Próximamente disponible')">
      <div class="notif-promo-icon">🛡️</div>
      <div class="notif-promo-info">
        <strong>Seguro de Hogar Premium</strong>
        <small>Protegé tu hogar desde $2.500/mes</small>
      </div>
      <button class="notif-promo-btn" onclick="event.stopPropagation();mostrarToast('Próximamente')">Ver más</button>
    </div>
    <div class="notif-promo-card" onclick="mostrarToast('Próximamente disponible')">
      <div class="notif-promo-icon">⭐</div>
      <div class="notif-promo-info">
        <strong>FIXIT Pro</strong>
        <small>Acceso prioritario a técnicos verificados · $999/mes</small>
      </div>
      <button class="notif-promo-btn" onclick="event.stopPropagation();mostrarToast('Próximamente')">Suscribirme</button>
    </div>
    <div class="notif-promo-card" onclick="mostrarToast('Próximamente disponible')">
      <div class="notif-promo-icon">🔒</div>
      <div class="notif-promo-info">
        <strong>Garantía FIXIT</strong>
        <small>Garantía extendida en todas tus reparaciones</small>
      </div>
      <button class="notif-promo-btn" onclick="event.stopPropagation();mostrarToast('Próximamente')">Ver más</button>
    </div>`;

  el.innerHTML = html;
}

// ==================== PAGO ====================
function mostrarPago(idOferta, precio, modalidad, tiempo) {
  const sol = state.solicitudActual;
  const impuestos = Math.round(precio * 0.21);
  const total = precio + impuestos;
  document.getElementById('pago-solicitud-id').textContent = '#' + String(sol?.id || 0).padStart(5,'0') + ' ›';
  document.getElementById('pago-modalidad').textContent = modalidad + ' | ' + (tiempo || '3-4 días') + ' ›';
  document.getElementById('pago-item-marca').textContent = sol?.categoria?.tipo || 'Técnico';
  document.getElementById('pago-item-nombre').textContent = sol?.categoria?.nombre || 'Servicio técnico';
  document.getElementById('pago-item-detalles').textContent = sol?.detalles || 'Servicio de reparación';
  document.getElementById('pago-precio').textContent = '$' + Number(precio).toLocaleString('es-AR');
  document.getElementById('pago-subtotal').textContent = '$' + Number(precio).toLocaleString('es-AR');
  document.getElementById('pago-impuestos').textContent = '$' + Number(impuestos).toLocaleString('es-AR');
  document.getElementById('pago-total').textContent = '$' + Number(total).toLocaleString('es-AR');
}

// ==================== SOLICITUD FORM ====================
const SOL_CONFIG = {
  Electrodomestico: {
    label: 'Electrodomésticos',
    subcatLabel: 'Tipo de electrodoméstico',
    subcatOpts: ['Lavarropas','Cocina','Freezer','Horno eléctrico','Microondas','Otros'],
    showMarca: true, showModelo: true,
    identLabel: 'Nro de serie', identOpcional: false,
  },
  Vehiculo: {
    label: 'Vehículos',
    subcatLabel: 'Tipo de vehículo',
    subcatOpts: ['Moto','Auto','Camioneta','Camión'],
    showMarca: true, showModelo: true,
    identLabel: 'Patente', identOpcional: false,
  },
  Electronica: {
    label: 'Electrónica',
    subcatLabel: 'Artículo',
    subcatOpts: ['Celular','Tablet','Computadora','Notebook','Periféricos'],
    showMarca: true, showModelo: true,
    identLabel: 'Nro de serie', identOpcional: true,
  },
  Hogar: {
    label: 'Hogar',
    subcatLabel: 'Especialidad',
    subcatOpts: ['Electricidad','Plomería','Gasista','Refrigeración'],
    showMarca: false, showModelo: false,
    identLabel: 'Problema', identOpcional: false,
  },
};
let _dbCategorias = [];

function solShow(id, visible) {
  document.getElementById(id).style.display = visible ? '' : 'none';
}

let _pickerTipo = '';

function _solCerrarDropdowns() {
  document.getElementById('sol-cat-dropdown').style.display = 'none';
  document.getElementById('sol-subcat-dropdown').style.display = 'none';
  document.getElementById('sol-cat-btn').classList.remove('open');
  document.getElementById('sol-subcat-btn').classList.remove('open');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('#sol-cat-btn') && !e.target.closest('#sol-cat-dropdown') &&
      !e.target.closest('#sol-subcat-btn') && !e.target.closest('#sol-subcat-dropdown')) {
    _solCerrarDropdowns();
    _pickerTipo = '';
  }
});

function solAbrirPicker(tipo) {
  const dropId = tipo === 'categoria' ? 'sol-cat-dropdown' : 'sol-subcat-dropdown';
  const btnId  = tipo === 'categoria' ? 'sol-cat-btn'      : 'sol-subcat-btn';
  const isOpen = document.getElementById(dropId).style.display !== 'none';

  _solCerrarDropdowns();

  if (isOpen) { _pickerTipo = ''; return; }

  _pickerTipo = tipo;
  let opts = [], valActual = '';
  if (tipo === 'categoria') {
    opts = Object.entries(SOL_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));
    valActual = document.getElementById('sol-categoria').dataset.tipo || '';
  } else {
    const catTipo = document.getElementById('sol-categoria').dataset.tipo || '';
    const cfg = SOL_CONFIG[catTipo];
    if (!cfg) return;
    opts = cfg.subcatOpts.map(o => ({ value: o, label: o }));
    valActual = document.getElementById('sol-subcategoria').value;
  }

  document.getElementById(dropId).innerHTML = opts.map(o => `
    <div class="picker-item" onclick="solSeleccionarPicker('${o.value}')">
      <span>${o.label}</span>
      <div class="picker-radio ${valActual === o.value ? 'selected' : ''}"></div>
    </div>`).join('');
  document.getElementById(dropId).style.display = 'block';
  document.getElementById(btnId).classList.add('open');
}

function solSeleccionarPicker(value) {
  _solCerrarDropdowns();
  if (_pickerTipo === 'categoria') {
    const cfg = SOL_CONFIG[value];
    const db = _dbCategorias.find(c => c.tipo === value);
    const id = db ? db.idcategoria : value;
    const inp = document.getElementById('sol-categoria');
    inp.value = id;
    inp.dataset.tipo = value;
    const btn = document.getElementById('sol-cat-label');
    btn.textContent = cfg.label;
    btn.classList.remove('sol-picker-placeholder');
    solCategoriaChange();
  } else {
    document.getElementById('sol-subcategoria').value = value;
    const lbl = document.getElementById('sol-subcat-label');
    lbl.textContent = value;
    lbl.classList.remove('sol-picker-placeholder');
  }
  _pickerTipo = '';
}

function solCategoriaChange() {
  const inp = document.getElementById('sol-categoria');
  const tipo = inp.dataset.tipo || '';
  const cfg = SOL_CONFIG[tipo];

  document.getElementById('sol-subcategoria').value = '';
  const sublbl = document.getElementById('sol-subcat-label');
  sublbl.textContent = cfg ? cfg.subcatLabel : 'SubCategoría';
  sublbl.classList.add('sol-picker-placeholder');

  const identEl = document.getElementById('sol-identificador');
  identEl.value = '';
  identEl.placeholder = cfg ? cfg.identLabel : 'Nro de serie';
  document.getElementById('sol-ident-opcional').classList.toggle('hidden', !(cfg && cfg.identOpcional));

  solShow('sol-marca-wrap', !cfg || cfg.showMarca);
  solShow('sol-modelo-wrap', !cfg || cfg.showModelo);
}

let _fotos = [];

function solAbrirFotos() {
  document.getElementById('sol-foto-input').click();
}

function solFotosSeleccionadas(input) {
  const nuevas = Array.from(input.files);
  _fotos = [..._fotos, ...nuevas].slice(0, 10);
  input.value = '';
  solRenderFotos();
}

function solRenderFotos() {
  const preview = document.getElementById('sol-foto-preview');
  preview.innerHTML = _fotos.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div class="sol-foto-thumb">
      <img src="${url}" alt="foto"/>
      <button class="sol-foto-thumb-del" onclick="solEliminarFoto(${i})">✕</button>
    </div>`;
  }).join('');
  document.getElementById('sol-foto-hint').textContent =
    `Fotos: ${_fotos.length}/10 · Cargá las fotos del problema o falla`;
}

function solEliminarFoto(idx) {
  _fotos.splice(idx, 1);
  solRenderFotos();
}

async function cargarCategoriasSelect(tipoFiltro = null) {
  _setAvatares();

  try {
    _dbCategorias = await api('GET', '/api/categorias');
  } catch (e) { _dbCategorias = []; }

  const inp = document.getElementById('sol-categoria');
  inp.value = ''; inp.dataset.tipo = '';
  document.getElementById('sol-cat-label').textContent = 'Categoría';
  document.getElementById('sol-cat-label').classList.add('sol-picker-placeholder');
  document.getElementById('sol-subcategoria').value = '';
  document.getElementById('sol-subcat-label').textContent = 'SubCategoría';
  document.getElementById('sol-subcat-label').classList.add('sol-picker-placeholder');
  document.getElementById('sol-marca').value = '';
  document.getElementById('sol-modelo').value = '';
  document.getElementById('sol-identificador').value = '';
  document.getElementById('sol-identificador').placeholder = 'Nro de serie';
  document.getElementById('sol-ident-opcional').classList.add('hidden');
  document.getElementById('sol-detalles').value = '';
  solShow('sol-marca-wrap', true);
  solShow('sol-modelo-wrap', true);
  _fotos = [];
  document.getElementById('sol-foto-input').value = '';
  document.getElementById('sol-foto-preview').innerHTML = '';
  document.getElementById('sol-foto-hint').textContent = 'Fotos: 0/10 · Cargá las fotos del problema o falla';

  if (tipoFiltro) {
    _pickerTipo = 'categoria';
    solSeleccionarPicker(tipoFiltro);
  }
}

// ==================== CHAT ====================
async function cargarChatList() {
  if (!state.token) return;
  try {
    const contactos = await api('GET', '/api/chat/contactos');
    const el = document.getElementById('chat-list-items');
    if (contactos.length === 0) {
      el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><div class="empty-state-title">Sin mensajes aún</div><div class="empty-state-sub">Los chats con tus técnicos aparecerán acá una vez que aceptes una oferta.</div></div>';
      return;
    }
    el.innerHTML = contactos.map(c => `
      <div class="chat-item" onclick="App.abrirChat(${c.userId}, '${c.nombre}')">
        <div class="chat-item-avatar">👤</div>
        <div class="chat-item-info">
          <strong>${c.nombre}</strong>
          <small>${c.ultimoMensaje || ''}</small>
        </div>
        <small class="text-muted">${c.fecha ? formatFechaCorta(c.fecha) : ''}</small>
      </div>`).join('');
  } catch (e) { mostrarToast('Error al cargar chats'); }
}

async function cargarMensajes(userId) {
  try {
    const msgs = await api('GET', '/api/chat/' + userId);
    const el = document.getElementById('chat-messages');
    el.innerHTML = '';
    msgs.forEach(m => appendMensaje(m, m.emisorId === state.userId));
    el.scrollTop = el.scrollHeight;

    clearInterval(state.chatPollInterval);
    state.chatPollInterval = setInterval(async () => {
      if (state.chatRecipientId !== userId) { clearInterval(state.chatPollInterval); return; }
      const nuevos = await api('GET', '/api/chat/' + userId);
      const el = document.getElementById('chat-messages');
      const cantidad = el.querySelectorAll('.chat-bubble').length;
      if (nuevos.length > cantidad) {
        el.innerHTML = '';
        nuevos.forEach(m => appendMensaje(m, m.emisorId === state.userId));
        el.scrollTop = el.scrollHeight;
      }
    }, 2000);
  } catch (e) { mostrarToast('Error al cargar mensajes'); }
}

function appendMensaje(m, esMio) {
  const el = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-bubble ' + (esMio ? 'sent' : 'received');
  div.textContent = m.mensaje;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// ==================== AVATAR GLOBAL ====================
function _setAvatares() {
  const inicial = (state.nombre || '?')[0].toUpperCase();
  ['sol-top-avatar', 'missol-top-avatar', 'perfil-avatar-sm', 'perfil-avatar-lg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = inicial;
  });
}

// ==================== PERFIL ====================
async function cargarPerfil() {
  _setAvatares();
  const nombreCompleto = (state.nombre + ' ' + state.apellido).trim();
  document.getElementById('perfil-nombre-full').textContent = nombreCompleto || '—';
  document.getElementById('perfil-username-display').textContent = state.telefono || 'Sin teléfono';
  document.getElementById('perfil-email-display').textContent = state.email || '—';
  if (state.tipo === 'tecnico') {
    const tipoEl = document.getElementById('perfil-tipo-sub');
    if (tipoEl) tipoEl.textContent = 'Técnico';
  }
  try {
    const cnt = await api('GET', '/api/solicitudes/finalizadas/count');
    const subEl = document.getElementById('perfil-solicitudes-sub');
    if (subEl) subEl.textContent = cnt.count + ' Solicitud' + (cnt.count !== 1 ? 'es' : '') + ' completada' + (cnt.count !== 1 ? 's' : '');
  } catch(e) { /* no crítico */ }

  const starsEl   = document.getElementById('perfil-stars');
  const labelEl   = document.getElementById('perfil-cal-label');
  if (starsEl && state.userId) {
    try {
      const data = await api('GET', '/api/calificaciones/usuario/' + state.userId + '/contexto/cliente');
      const prom = data.total > 0 ? parseFloat(data.promedio) : 5.0;
      if (labelEl) {
        labelEl.textContent = 'Calificación - ' + prom.toFixed(2);
        labelEl.classList.remove('perfil-cal-label-hidden');
      }
      starsEl.innerHTML = renderStarsFull(prom);
    } catch(e) {
      if (labelEl) {
        labelEl.textContent = 'Calificación - 5.00';
        labelEl.classList.remove('perfil-cal-label-hidden');
      }
      starsEl.innerHTML = renderStarsFull(5);
    }
  }
}

function cargarPerfilEmail() {
  document.getElementById('perfil-email-val').textContent = state.email || '—';
}

function cargarPerfilUsername() {
  document.getElementById('edit-nombre').value = state.nombre;
  document.getElementById('edit-apellido').value = state.apellido;
  const parts = (state.telefono || '').split(' ');
  document.getElementById('edit-cod-pais').value  = parts[0] || '';
  document.getElementById('edit-cod-area').value  = parts[1] || '';
  document.getElementById('edit-telefono-num').value = parts.slice(2).join(' ') || '';
}

function limpiarFormPassword() {
  ['pass-actual', 'pass-nueva', 'pass-confirmar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

// ==================== PERFIL - GUARDAR NOMBRE ====================
async function guardarNombre() {
  const nombre   = v('edit-nombre');
  const apellido = v('edit-apellido');
  const codPais  = v('edit-cod-pais').replace(/\s/g,'');
  const codArea  = v('edit-cod-area').replace(/\s/g,'');
  const telNum   = v('edit-telefono-num').replace(/\s/g,'');
  if (!nombre || !apellido) { mostrarToast('Completá nombre y apellido'); return; }
  const telefono = codPais && codArea && telNum ? `${codPais} ${codArea} ${telNum}` : '';
  loading(true);
  try {
    const data = await api('PUT', '/api/auth/nombre', { nombre, apellido, telefono });
    state.nombre = data.nombre;
    state.apellido = data.apellido;
    state.telefono = data.telefono || '';
    localStorage.setItem('fixit_nombre', data.nombre);
    localStorage.setItem('fixit_apellido', data.apellido);
    localStorage.setItem('fixit_telefono', data.telefono || '');
    mostrarToast('Cuenta actualizada');
    go('perfil');
  } catch (e) { mostrarToast(e.message); }
  finally { loading(false); }
}
App.guardarNombre = guardarNombre;

// ==================== PERFIL - CAMBIAR CONTRASEÑA ====================
async function cambiarContrasena() {
  const actual = v('pass-actual');
  const nueva = v('pass-nueva');
  const confirmar = v('pass-confirmar');
  if (!actual || !nueva || !confirmar) { mostrarToast('Completá todos los campos'); return; }
  if (nueva !== confirmar) { mostrarToast('Las contraseñas no coinciden'); return; }
  if (nueva.length < 6) { mostrarToast('La contraseña debe tener al menos 6 caracteres'); return; }
  loading(true);
  try {
    await api('PUT', '/api/auth/password', { actual, nueva });
    mostrarToast('Contraseña actualizada');
    go('perfil');
  } catch (e) { mostrarToast(e.message); }
  finally { loading(false); }
}
App.cambiarContrasena = cambiarContrasena;

// ==================== DIRECCIONES (helpers) ====================
async function _getDirs() {
  try {
    const res = await api('GET', '/api/auth/direcciones');
    return JSON.parse(res.direcciones || '[]');
  } catch { return []; }
}
async function _saveDirs(dirs) {
  await api('PUT', '/api/auth/direcciones', { direcciones: JSON.stringify(dirs) });
}

// ==================== PANTALLA UBICACION ====================
async function cargarUbicacion() {
  const skipBtn = document.querySelector('.ubic-skip-btn');
  if (skipBtn) skipBtn.style.display = state.ubicacionRequerida ? 'none' : '';

  const section = document.getElementById('ubic-dirs-section');
  const list = document.getElementById('ubic-dirs-list');
  section.classList.add('hidden');

  const dirs = await _getDirs();
  if (dirs.length === 0) return;

  section.classList.remove('hidden');
  list.innerHTML = dirs.map((d, i) => `
    <div class="ubic-dir-item" onclick="seleccionarDireccionUbicacion(${i})">
      <div class="ubic-dir-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div class="ubic-dir-texts">
        <span class="ubic-dir-alias">${d.alias}</span>
        <span class="ubic-dir-calle">${d.calle}, ${d.ciudad}</span>
      </div>
    </div>`).join('');
}

async function seleccionarDireccionUbicacion(idx) {
  const dirs = await _getDirs();
  const d = dirs[idx];
  if (!d) return;
  state.ubicacionActual = `${d.calle}, ${d.ciudad}${d.provincia ? ', ' + d.provincia : ''}`;
  localStorage.setItem('fixit_ubicacion', state.ubicacionActual);
  _postUbicacionSeleccionada();
}

async function _postUbicacionSeleccionada() {
  if (state.ubicacionRequerida && state._solicitudPendiente) {
    const { categoriaId, detalles } = state._solicitudPendiente;
    state.ubicacionRequerida = false;
    state._solicitudPendiente = null;
    try {
      loading(true);
      await api('POST', '/api/solicitudes', { categoriaId, detalles, ubicacion: state.ubicacionActual });
      mostrarToast('¡Solicitud enviada!');
      go('mis-solicitudes');
    } catch(e) { mostrarToast(e.message); }
    finally { loading(false); }
  } else {
    state.ubicacionRequerida = false;
    go('home');
  }
}

function usarUbicacionActual() {
  if (!navigator.geolocation) {
    mostrarToast('Tu dispositivo no soporta geolocalización');
    return;
  }
  const btn = document.getElementById('ubic-gps-btn');
  const resultDiv = document.getElementById('ubic-gps-result');
  const addressEl = document.getElementById('ubic-gps-address');
  const gpsIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>`;

  if (btn) { btn.disabled = true; btn.innerHTML = `${gpsIcon} Obteniendo ubicación…`; }
  if (resultDiv) resultDiv.classList.add('hidden');

  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      let address = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=es`);
        const data = await res.json();
        if (data.address) {
          const a = data.address;
          const calle = a.road || a.pedestrian || a.footway || '';
          const numero = a.house_number ? ` ${a.house_number}` : '';
          const ciudad = a.city || a.town || a.village || a.county || '';
          const provincia = a.state || '';
          address = [calle + numero, ciudad, provincia].filter(Boolean).join(', ');
        } else if (data.display_name) {
          address = data.display_name.split(',').slice(0, 3).map(p => p.trim()).join(', ');
        }
      } catch(e) { /* usa coordenadas como fallback */ }

      state.ubicacionActual = address;
      localStorage.setItem('fixit_ubicacion', address);

      if (btn) { btn.disabled = false; btn.innerHTML = `${gpsIcon} Cambiar ubicación`; }
      if (addressEl) addressEl.textContent = address;
      if (resultDiv) resultDiv.classList.remove('hidden');
    },
    err => {
      if (btn) { btn.disabled = false; btn.innerHTML = `${gpsIcon} Usar mi ubicación actual`; }
      if (err.code === err.PERMISSION_DENIED)
        mostrarToast('GPS bloqueado. Ingresá tu dirección manualmente.');
      else
        mostrarToast('No se pudo obtener la ubicación. Ingresá tu dirección.');
      const inp = document.getElementById('ubic-manual-input');
      if (inp) inp.focus();
    },
    { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
  );
}

function confirmarUbicacionManual() {
  const val = (document.getElementById('ubic-manual-input')?.value || '').trim();
  if (!val) { mostrarToast('Ingresá una dirección'); return; }
  state.ubicacionActual = val;
  localStorage.setItem('fixit_ubicacion', val);
  _postUbicacionSeleccionada();
}

async function cargarDirecciones() {
  const el = document.getElementById('direcciones-list');
  el.innerHTML = '<div class="loading-state"><div class="spinner-sm"></div><div class="loading-state-label">Cargando…</div></div>';
  const dirs = await _getDirs();
  if (dirs.length === 0) {
    el.innerHTML = '<p class="dir-empty">No tenés direcciones guardadas</p>';
    return;
  }
  el.innerHTML = dirs.map((d, i) => `
    <div class="dir-item">
      <div class="dir-item-texts">
        <span class="dir-item-alias">${d.alias}</span>
        <span class="dir-item-calle">${d.calle}</span>
        <span class="dir-item-ciudad">${d.ciudad}, ${d.provincia}</span>
      </div>
      <button class="dir-delete-btn" onclick="App.eliminarDireccion(${i})">✕</button>
    </div>`).join('');
}

function mostrarFormDireccion() {
  document.getElementById('form-direccion').style.display = 'block';
  document.getElementById('btn-add-dir').style.display = 'none';
}
function ocultarFormDireccion() {
  document.getElementById('form-direccion').style.display = 'none';
  document.getElementById('btn-add-dir').style.display = 'block';
  ['dir-alias','dir-calle','dir-ciudad','dir-provincia'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}
async function guardarDireccion() {
  const alias = v('dir-alias') || 'Mi dirección';
  const calle = v('dir-calle');
  const ciudad = v('dir-ciudad');
  const provincia = v('dir-provincia');
  if (!calle || !ciudad) { mostrarToast('Completá calle y ciudad'); return; }
  const dirs = await _getDirs();
  dirs.push({ alias, calle, ciudad, provincia });
  await _saveDirs(dirs);
  ocultarFormDireccion();
  cargarDirecciones();
  mostrarToast('Dirección guardada');
}
async function eliminarDireccion(idx) {
  const dirs = await _getDirs();
  dirs.splice(idx, 1);
  await _saveDirs(dirs);
  cargarDirecciones();
}
App.mostrarFormDireccion = mostrarFormDireccion;
App.ocultarFormDireccion = ocultarFormDireccion;
App.guardarDireccion = guardarDireccion;
App.eliminarDireccion = eliminarDireccion;

// ==================== PERFIL - PRIVACIDAD ====================
function cargarPrivacidad() {
  const prefs = JSON.parse(localStorage.getItem('fixit_privacidad') || '{}');
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
  localStorage.setItem('fixit_privacidad', JSON.stringify(prefs));
}
App.guardarPrivacidad = guardarPrivacidad;

// ==================== PERFIL - ACCESIBILIDAD ====================
function cargarAccesibilidad() {
  const prefs = JSON.parse(localStorage.getItem('fixit_accesibilidad') || '{}');
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
  localStorage.setItem('fixit_accesibilidad', JSON.stringify(prefs));
  aplicarAccesibilidad(prefs);
}
function aplicarAccesibilidad(prefs) {
  const app = document.querySelector('.app');
  if (!app) return;
  app.classList.toggle('dark-mode', !!prefs['acc-dark-mode']);
  app.classList.toggle('high-contrast', !!prefs['acc-contraste']);
  app.classList.toggle('large-text', !!prefs['acc-texto-grande']);
  app.classList.toggle('reduce-motion', !!prefs['acc-animaciones']);
}
App.guardarAccesibilidad = guardarAccesibilidad;

// ==================== PERFIL - NOTIFICACIONES ====================
function cargarNotificacionesPerfil() {
  const prefs = JSON.parse(localStorage.getItem('fixit_notifs_config') || '{}');
  const defaults = { 'notif-ofertas': true, 'notif-chat': true, 'notif-solicitudes': true, 'notif-push': true, 'notif-sonido': true, 'notif-vibracion': false, 'notif-promo': false };
  Object.entries(defaults).forEach(([id, def]) => {
    const el = document.getElementById(id);
    if (el) el.checked = id in prefs ? prefs[id] : def;
  });
}
function guardarNotificaciones() {
  const ids = ['notif-ofertas','notif-chat','notif-solicitudes','notif-push','notif-sonido','notif-vibracion','notif-promo'];
  const prefs = {};
  ids.forEach(id => { const el = document.getElementById(id); if (el) prefs[id] = el.checked; });
  localStorage.setItem('fixit_notifs_config', JSON.stringify(prefs));
}
App.guardarNotificaciones = guardarNotificaciones;

// ==================== UTILS ====================
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function encodeObj(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "\\'") + "'";
}

function renderStarsFull(rating) {
  return _renderStars(parseFloat(rating) || 0);
}

function renderStarsText(rating) {
  const r = parseFloat(rating) || 0;
  return renderStarsFull(r) + `<span style="font-size:12px;color:#888;margin-left:4px">${r > 0 ? r.toFixed(1) : ''}</span>`;
}

function formatFecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' });
}

function formatFechaCorta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
  return d.toLocaleDateString('es-AR', { day:'numeric', month:'short' });
}

// ==================== CALIFICACIONES ====================
function mostrarPantallaCalificar() {
  const d = state.calificarData;
  document.getElementById('calificar-titulo').textContent = d.titulo || 'Calificar';
  document.getElementById('calificar-nombre').textContent = d.nombre || '';
  document.getElementById('calificar-subtitulo').textContent = d.subtitulo || '';
  document.getElementById('cal-opinion').value = '';
  document.getElementById('cal-label').textContent = 'Tocá una estrella para calificar';
  document.getElementById('btn-enviar-cal').disabled = true;
  document.querySelectorAll('.cal-star').forEach(b => b.classList.remove('selected'));
  go('calificar');
}

function seleccionarEstrella(val) {
  if (!state.calificarData) return;
  state.calificarData.estrellasSeleccionadas = val;
  const labels = ['', 'Muy malo 😞', 'Malo 😕', 'Regular 😐', 'Bueno 😊', '¡Excelente! 🌟'];
  document.getElementById('cal-label').textContent = labels[val] || 'Tocá una estrella para calificar';
  document.querySelectorAll('.cal-star').forEach(b =>
    b.classList.toggle('selected', parseInt(b.dataset.val) <= val));
  document.getElementById('btn-enviar-cal').disabled = false;
}

async function enviarCalificacion(omitir) {
  if (!state.calificarData) return;
  // Omitir guarda 5 estrellas por defecto
  const estrellas = omitir ? 5 : (state.calificarData.estrellasSeleccionadas || 0);
  if (!omitir && !estrellas) { mostrarToast('Seleccioná una calificación'); return; }
  const opinion = omitir ? '' : document.getElementById('cal-opinion').value.trim();
  try {
    loading(true);
    await api('POST', '/api/calificaciones', {
      destinatarioId: state.calificarData.destinatarioId,
      solicitudId:    state.calificarData.solicitudId,
      estrellas,
      opinion,
      contexto: state.calificarData.contexto || 'tecnico',
    });
    mostrarToast(omitir ? 'Podés calificar después desde el historial' : '¡Gracias por tu calificación!');
    state.calificarData = null;
    go(state.tipo === 'tecnico' ? 'solicitudes-tecnico' : 'mis-solicitudes');
  } catch(e) { mostrarToast(e.message); }
  finally { loading(false); }
}

function badgeClass(estado) {
  const m = { 'Pendiente': 'badge-pendiente', 'En proceso': 'badge-proceso', 'Finalizada': 'badge-finalizada', 'Cancelada': 'badge-cancelada' };
  return m[estado] || 'badge-pendiente';
}

function mostrarToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function loading(show) {
  document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// ==================== INICIO ====================
document.addEventListener('DOMContentLoaded', async () => {
  const savedPrefs = JSON.parse(localStorage.getItem('fixit_accesibilidad') || '{}');
  aplicarAccesibilidad(savedPrefs);
  if (state.token) {
    try {
      await api('GET', '/api/auth/check');
      go('home');
    } catch(e) {
      // api() ya maneja el 401 → limpia localStorage y va a login
    }
  } else {
    go('login');
  }
});
