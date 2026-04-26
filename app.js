// ============================================================
//  app.js — Finanzas Personales
//  Llama al backend de Google Apps Script via fetch()
// ============================================================



// ============================================================
//  INIT
// ============================================================
window.onload = function () {
  if (!WEBAPP_URL) {
    renderConfigScreen();
  } else {
    renderApp();
    loadPanel();
    loadConfigData(() => {
      fillCuentasOrigen();
      setDefaultDates();
    });
  }
};

// ============================================================
//  PANTALLA DE CONFIGURACION (primera vez)
// ============================================================
function renderConfigScreen() {
  document.getElementById('app').innerHTML = `
    <div class="config-screen">
      <div style="font-size:48px; margin-bottom:16px;">💰</div>
      <h2>Finanzas Personales</h2>
      <p>Pegá el link de tu Web App de Google Apps Script para conectar con tu planilla.</p>
      <div style="width:100%; max-width:400px;">
        <div class="form-group">
          <label>URL de tu Web App</label>
          <input type="url" id="cfg-url" placeholder="https://script.google.com/macros/s/.../exec">
        </div>
        <button class="btn btn-primary" onclick="guardarConfig()">Conectar</button>
      </div>
      <p style="margin-top:24px; font-size:13px;">Apps Script → Implementar → Administrar implementaciones → copiá el link</p>
    </div>
  `;
}

function guardarConfig() {
  const url = document.getElementById('cfg-url').value.trim();
  if (!url.includes('script.google.com')) {
    alert('El link no parece correcto. Tiene que ser de script.google.com');
    return;
  }
  localStorage.setItem('finanzas_url', url);
  location.reload();
}

// ============================================================
//  ESTRUCTURA DE LA APP
// ============================================================
function renderApp() {
  document.getElementById('app').innerHTML = `
    <nav>
      <button class="active" onclick="showPage('panel', this)">
        <span class="nav-icon">📊</span>
        <span class="nav-label">Panel</span>
      </button>
      <button onclick="showPage('cargar', this)">
        <span class="nav-icon">➕</span>
        <span class="nav-label">Cargar</span>
      </button>
      <button onclick="showPage('usd', this)">
        <span class="nav-icon">💵</span>
        <span class="nav-label">USD</span>
      </button>
      <button onclick="showPage('movimientos', this)">
        <span class="nav-icon">📋</span>
        <span class="nav-label">Movimientos</span>
      </button>
    </nav>

    <div id="page-panel" class="page active">
      <div id="panel-content" class="loading">
        <div class="spinner"></div>Cargando datos...
      </div>
    </div>

    <div id="page-cargar" class="page">
      <div class="section-title">Tipo de movimiento</div>
      <div class="quick-btns">
        <div class="quick-btn" onclick="setTipo('Ingreso')">
          <div class="icon">💰</div>
          <div class="title">Ingreso</div>
          <div class="desc">Sueldo, honorarios</div>
        </div>
        <div class="quick-btn" onclick="setTipo('Gasto')">
          <div class="icon">🛒</div>
          <div class="title">Gasto</div>
          <div class="desc">Gastos del día</div>
        </div>
        <div class="quick-btn" onclick="setTipo('Inversion')">
          <div class="icon">📈</div>
          <div class="title">Inversión</div>
          <div class="desc">Acciones, plazo fijo</div>
        </div>
        <div class="quick-btn" onclick="setTipo('Transferencia')">
          <div class="icon">↔️</div>
          <div class="title">Transferencia</div>
          <div class="desc">Entre cuentas</div>
        </div>
      </div>
      <div class="card" id="form-mov" style="display:none">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px;">
          <div style="font-weight:700; font-size:17px;" id="form-tipo-label">Nuevo movimiento</div>
          <button class="btn btn-secondary" onclick="resetForm()">✕ Cambiar</button>
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="f-fecha">
        </div>
        <div class="grid2" style="gap:10px; margin-bottom:16px;">
          <div class="form-group" style="margin:0">
            <label>Moneda</label>
            <select id="f-moneda">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label>Monto</label>
            <input type="number" id="f-monto" placeholder="0" inputmode="decimal">
          </div>
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select id="f-categoria"></select>
        </div>
        <div class="form-group">
          <label>Cuenta</label>
          <select id="f-cuenta"></select>
        </div>
        <div class="form-group">
          <label>Observaciones (opcional)</label>
          <textarea id="f-obs" placeholder="Ej: supermercado, gym..."></textarea>
        </div>
        <button class="btn btn-primary" onclick="guardarMovimiento()">✓ Guardar movimiento</button>
        <div class="alert" id="alert-mov"></div>
      </div>
    </div>

    <div id="page-usd" class="page">
      <div class="section-title">Registrar compra de dólares</div>
      <div class="card">
        <div class="form-group">
          <label>Fecha</label>
          <input type="date" id="u-fecha">
        </div>
        <div class="form-group">
          <label>Tipo de dólar</label>
          <select id="u-tipo">
            <option value="BLUE">Blue</option>
            <option value="MEP">MEP</option>
            <option value="CCL">CCL</option>
            <option value="Oficial">Oficial</option>
          </select>
        </div>
        <div class="grid2" style="gap:10px; margin-bottom:16px;">
          <div class="form-group" style="margin:0">
            <label>Pesos invertidos</label>
            <input type="number" id="u-pesos" placeholder="1000000" inputmode="decimal" oninput="calcUSD()">
          </div>
          <div class="form-group" style="margin:0">
            <label>Cotización</label>
            <input type="number" id="u-cotizacion" placeholder="1440" inputmode="decimal" oninput="calcUSD()">
          </div>
        </div>
        <div class="form-group">
          <label>Cuenta origen (pesos)</label>
          <select id="u-origen"></select>
        </div>
        <div class="form-group">
          <label>Destino USD</label>
          <select id="u-destino">
            <option value="USD Fisicos">USD Físicos</option>
            <option value="Galicia Cuenta USD">Galicia Cuenta USD</option>
            <option value="Caja USD">Caja USD</option>
          </select>
        </div>
        <div class="calc-box">
          <div class="calc-row"><span>Pesos</span><span id="c-pesos">$ 0</span></div>
          <div class="calc-row"><span>Cotización</span><span id="c-cot">$ 0</span></div>
          <div class="calc-row total"><span>USD a recibir</span><span id="c-usd">U$S 0</span></div>
        </div>
        <div style="margin-top:18px;">
          <button class="btn btn-green" onclick="guardarCompraUSD()">✓ Registrar compra USD</button>
        </div>
        <div class="alert" id="alert-usd"></div>
      </div>
    </div>

    <div id="page-movimientos" class="page">
      <div id="movimientos-content" class="loading">
        <div class="spinner"></div>Cargando...
      </div>
    </div>
  `;
}

// ============================================================
//  NAVEGACION
// ============================================================
function showPage(page, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (btn) btn.classList.add('active');
  if (page === 'panel') loadPanel();
  if (page === 'movimientos') loadMovimientos();
}

// ============================================================
//  API: JSONP (evita CORS con Apps Script)
// ============================================================
var WEBAPP_URL = localStorage.getItem('finanzas_url') || '';

function callBackend(action, params) {
  return new Promise(function(resolve, reject) {
    var cbName = 'cb_' + Date.now();
    var url = WEBAPP_URL + '?action=' + action + '&callback=' + cbName;
    if (params) {
      Object.keys(params).forEach(function(k) {
        url += '&' + k + '=' + encodeURIComponent(params[k]);
      });
    }
    window[cbName] = function(data) {
      delete window[cbName];
      var el = document.getElementById('jsonp-' + cbName);
      if (el) el.remove();
      resolve(data);
    };
    var script = document.createElement('script');
    script.id = 'jsonp-' + cbName;
    script.src = url;
    script.onerror = function() { reject(new Error('Error JSONP')); };
    document.head.appendChild(script);
    setTimeout(function() {
      if (window[cbName]) { delete window[cbName]; reject(new Error('Timeout')); }
    }, 15000);
  });
}

function postBackend(action, body) {
  return new Promise(function(resolve, reject) {
    var cbName = 'cb_' + Date.now() + '_p';
    var url = WEBAPP_URL + '?action=' + action + '&callback=' + cbName + '&data=' + encodeURIComponent(JSON.stringify(body));
    window[cbName] = function(data) {
      delete window[cbName];
      var el = document.getElementById('jsonp-' + cbName);
      if (el) el.remove();
      resolve(data);
    };
    var script = document.createElement('script');
    script.id = 'jsonp-' + cbName;
    script.src = url;
    script.onerror = function() { reject(new Error('Error JSONP')); };
    document.head.appendChild(script);
    setTimeout(function() {
      if (window[cbName]) { delete window[cbName]; reject(new Error('Timeout')); }
    }, 15000);
  });
}

// ============================================================
//  PANEL
// ============================================================
function loadPanel() {
  const el = document.getElementById('panel-content');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando datos...</div>';
  callBackend('getDashboardData')
    .then(d => renderPanel(d))
    .catch(() => { el.innerHTML = '<div class="loading" style="color:var(--danger)">Error al conectar. Verificá la URL.</div>'; });
}

function fmt(n) {
  if (!n || isNaN(n)) return '$ 0';
  return '$ ' + Math.round(n).toLocaleString('es-AR');
}

function renderPanel(d) {
  const meses = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesLabel = d.mes ? meses[d.mes] + ' ' + d.anio : 'Último mes';
  const ahorroPct = d.pctAhorro ? (parseFloat(d.pctAhorro) * 100).toFixed(1) + '%' : '0%';

  let activosHTML = '';
  if (d.activos && d.activos.length) {
    activosHTML = `<div class="section-title">Portafolio</div><div class="mov-list">` +
      d.activos.map(a => {
        const rend = parseFloat(a.rendPct) || 0;
        const rendClass = rend >= 0 ? 'rend-pos' : 'rend-neg';
        const rendStr = (rend >= 0 ? '+' : '') + (rend * 100).toFixed(1) + '%';
        return `<div class="activo-item">
          <div>
            <span class="activo-ticker">${a.ticker}</span>
            <div style="font-size:14px; margin-top:5px; font-weight:500">${a.nombre}</div>
            <div style="font-size:12px; color:var(--muted)">${a.cantidad} acciones</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700; font-size:16px">${fmt(a.valorActual)}</div>
            <div class="${rendClass}" style="font-size:13px">${rendStr}</div>
          </div>
        </div>`;
      }).join('') + `</div>`;
  }

  document.getElementById('panel-content').innerHTML = `
    <div class="section-title">Patrimonio total</div>
    <div class="grid2">
      <div class="kpi purple">
        <div class="label">ARS</div>
        <div class="value">${fmt(d.patrimonioARS)}</div>
      </div>
      <div class="kpi warn">
        <div class="label">USD</div>
        <div class="value">U$S ${parseFloat(d.patrimonioUSD || 0).toLocaleString('es-AR', {maximumFractionDigits:0})}</div>
      </div>
    </div>

    <div class="section-title">${mesLabel}</div>
    <div class="grid3">
      <div class="kpi green">
        <div class="label">Ingresos</div>
        <div class="value" style="font-size:18px">${fmt(d.ingresos)}</div>
      </div>
      <div class="kpi red">
        <div class="label">Gastos</div>
        <div class="value" style="font-size:18px">${fmt(d.gastos)}</div>
      </div>
      <div class="kpi">
        <div class="label">Ahorro</div>
        <div class="value" style="font-size:18px; color:var(--accent)">${fmt(d.ahorro)}</div>
        <div class="sub">${ahorroPct}</div>
      </div>
    </div>

    <div class="section-title">Dólar hoy</div>
    <div class="grid2">
      <div class="kpi warn">
        <div class="label">Blue</div>
        <div class="value" style="font-size:20px">$ ${d.dolarBlue ? parseFloat(d.dolarBlue).toLocaleString('es-AR') : '–'}</div>
      </div>
      <div class="kpi">
        <div class="label">MEP</div>
        <div class="value" style="font-size:20px">$ ${d.dolarMEP ? parseFloat(d.dolarMEP).toLocaleString('es-AR') : '–'}</div>
      </div>
    </div>

    ${activosHTML}
  `;
}

// ============================================================
//  CONFIG / DROPDOWNS
// ============================================================
let config = null;

function loadConfigData(cb) {
  if (config) { cb(); return; }
  callBackend('getConfig')
    .then(c => { config = c; cb(); })
    .catch(() => console.warn('No se pudo cargar config'));
}

function fillCuentasOrigen() {
  if (!config) return;
  const el = document.getElementById('u-origen');
  if (!el) return;
  el.innerHTML = '';
  config.cuentas.forEach(c => el.appendChild(new Option(c, c)));
}

function setDefaultDates() {
  const hoy = new Date().toISOString().split('T')[0];
  ['f-fecha', 'u-fecha'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = hoy;
  });
}

// ============================================================
//  CARGAR MOVIMIENTO
// ============================================================
let tipoSeleccionado = null;

function setTipo(tipo) {
  tipoSeleccionado = tipo;
  document.getElementById('form-tipo-label').textContent = tipo;
  document.getElementById('form-mov').style.display = 'block';
  document.querySelectorAll('.quick-btns').forEach(el => el.style.display = 'none');

  loadConfigData(() => {
    const catEl = document.getElementById('f-categoria');
    const cuentaEl = document.getElementById('f-cuenta');
    catEl.innerHTML = '';
    cuentaEl.innerHTML = '';
    const cats = tipo === 'Ingreso' ? config.categIngresos : config.categGastos;
    (cats || []).forEach(c => catEl.appendChild(new Option(c, c)));
    (config.cuentas || []).forEach(c => cuentaEl.appendChild(new Option(c, c)));
    setDefaultDates();
  });
}

function resetForm() {
  tipoSeleccionado = null;
  document.getElementById('form-mov').style.display = 'none';
  document.querySelectorAll('.quick-btns').forEach(el => el.style.display = 'grid');
  hideAlert('alert-mov');
}

function guardarMovimiento() {
  const body = {
    tipo: tipoSeleccionado,
    fecha: document.getElementById('f-fecha').value,
    moneda: document.getElementById('f-moneda').value,
    monto: document.getElementById('f-monto').value,
    categoria: document.getElementById('f-categoria').value,
    subcategoria: '',
    cuenta: document.getElementById('f-cuenta').value,
    observaciones: document.getElementById('f-obs').value
  };
  if (!body.monto || !body.fecha) { showAlert('alert-mov', 'Completá fecha y monto', false); return; }
  showAlert('alert-mov', 'Guardando...', true);
  postBackend('saveMovimiento', body)
    .then(r => {
      if (r.ok) { showAlert('alert-mov', '✓ Movimiento guardado', true); resetForm(); }
      else showAlert('alert-mov', 'Error: ' + r.error, false);
    })
    .catch(() => showAlert('alert-mov', 'Error de conexión', false));
}

// ============================================================
//  COMPRA USD
// ============================================================
function calcUSD() {
  const pesos = parseFloat(document.getElementById('u-pesos').value) || 0;
  const cot = parseFloat(document.getElementById('u-cotizacion').value) || 0;
  document.getElementById('c-pesos').textContent = '$ ' + pesos.toLocaleString('es-AR');
  document.getElementById('c-cot').textContent = '$ ' + cot.toLocaleString('es-AR');
  document.getElementById('c-usd').textContent = cot > 0 ? 'U$S ' + (pesos / cot).toFixed(2) : 'U$S 0';
}

function guardarCompraUSD() {
  const body = {
    fecha: document.getElementById('u-fecha').value,
    tipoDolar: document.getElementById('u-tipo').value,
    pesosInvertidos: document.getElementById('u-pesos').value,
    cotizacion: document.getElementById('u-cotizacion').value,
    cuentaOrigen: document.getElementById('u-origen').value,
    destinoUSD: document.getElementById('u-destino').value
  };
  if (!body.pesosInvertidos || !body.cotizacion) { showAlert('alert-usd', 'Completá pesos y cotización', false); return; }
  showAlert('alert-usd', 'Guardando...', true);
  postBackend('saveCompraUSD', body)
    .then(r => {
      if (r.ok) showAlert('alert-usd', '✓ Compra registrada — U$S ' + r.usdCalculados, true);
      else showAlert('alert-usd', 'Error: ' + r.error, false);
    })
    .catch(() => showAlert('alert-usd', 'Error de conexión', false));
}

// ============================================================
//  MOVIMIENTOS
// ============================================================
function loadMovimientos() {
  const el = document.getElementById('movimientos-content');
  if (!el) return;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';
  callBackend('getUltimosMovimientos', { n: 30 })
    .then(rows => {
      if (!rows.length) { el.innerHTML = '<div class="loading">Sin movimientos</div>'; return; }
      const meses = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      el.innerHTML = '<div class="section-title">Últimos 30 movimientos</div><div class="mov-list">' +
        rows.map(r => {
          const d = new Date(r.fecha);
          const fechaStr = isNaN(d) ? '' : d.getDate() + ' ' + meses[d.getMonth() + 1];
          const tipo = (r.tipo || '').toLowerCase();
          const tipoClass = tipo.includes('ingreso') ? 'tipo-ingreso' : tipo.includes('gasto') ? 'tipo-gasto' : 'tipo-inversion';
          const montoStr = r.moneda === 'USD' ? 'U$S ' + parseFloat(r.monto || 0).toFixed(2) : fmt(r.monto);
          return `<div class="mov-item">
            <div class="mov-left">
              <span class="mov-tipo ${tipoClass}">${r.tipo || '–'}</span>
              <div class="mov-cat">${r.obs || r.categoria || '–'}</div>
            </div>
            <div class="mov-right">
              <div class="mov-monto">${montoStr}</div>
              <div class="mov-cuenta">${fechaStr} · ${r.cuenta || ''}</div>
            </div>
          </div>`;
        }).join('') + '</div>';
    })
    .catch(() => { el.innerHTML = '<div class="loading" style="color:var(--danger)">Error al cargar</div>'; });
}

// ============================================================
//  HELPERS
// ============================================================
function showAlert(id, msg, ok) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert ' + (ok ? 'ok' : 'err');
  el.style.display = 'block';
  if (ok && msg !== 'Guardando...') setTimeout(() => { el.style.display = 'none'; }, 4000);
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
