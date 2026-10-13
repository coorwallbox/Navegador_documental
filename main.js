/* ================================================================
   CONSULTA DOCUMENTAL
   main.js · Fase 1 · 2026
   Módulo principal de la aplicación.
   Depende de: catalog.js, utils.js y demo-data.js (deben cargarse antes en el HTML)

   Flujo:
     1. DOMContentLoaded → App.init()
     2. Carga automática de documentos (modo demo o Power Automate)
     3. Los filtros se llenan desde catalog.js y se aplican los de la URL
        (?proceso=TAL&banda=…&nivel=…&tipo=…&empresa=…&estado=…&q=…)
     4. Usuario busca por nombre o código y combina filtros; la tabla
        y la URL se actualizan en vivo
================================================================ */

const App = (() => {

  'use strict';

  /* ============================================================
     CONFIGURACIÓN
  ============================================================ */
  const CONFIG = {
    // URL del flujo que consulta los documentos del Excel en SharePoint.
    // Se configura en la Fase 5 (integración real con Power Automate).
    URL_DOCUMENTS: '[POWER_AUTOMATE_URL_DOCUMENTS]',

    // Tiempo máximo de espera para la llamada a Power Automate (ms)
    TIMEOUT_MS: 30000,

    // Modo demo: true = usa DEMO_DOCUMENTS en vez de llamar a Power Automate
    MODO_DEMO: true,
  };


  /* ============================================================
     ESTADO CENTRALIZADO
  ============================================================ */
  const state = {
    /** Todos los documentos cargados (sin filtrar) */
    allDocuments: [],

    /** Documentos actualmente visibles en la tabla (tras búsqueda/filtro) */
    visibleDocuments: [],

    /** Flag de carga en curso */
    loadingDocuments: false,

    /** Documento actualmente mostrado en el panel de detalle (o null) */
    detailDocument: null,

    /** Elemento que tenía el foco antes de abrir el panel de detalle */
    lastFocusedElement: null,
  };


  /* ============================================================
     REFERENCIAS AL DOM
  ============================================================ */
  const DOM = {};


  /* ============================================================
     1. INICIALIZACIÓN
  ============================================================ */

  /** Punto de entrada de la aplicación. */
  async function init() {
    _cacheDOM();
    Utils.Loader.init();
    Utils.Toast.init();
    _bindEvents();
    await _loadDocuments();
    Utils.General.log('Aplicación inicializada · Modo demo:', CONFIG.MODO_DEMO);
  }

  /** Almacena referencias a los elementos del DOM más utilizados. @private */
  function _cacheDOM() {
    DOM.inputSearch          = document.getElementById('input-busqueda');
    DOM.selectProcess        = document.getElementById('select-proceso');
    DOM.selectBand           = document.getElementById('select-banda');
    DOM.selectLevel          = document.getElementById('select-nivel');
    DOM.selectType           = document.getElementById('select-tipo');
    DOM.selectCompany        = document.getElementById('select-empresa');
    DOM.selectStatus         = document.getElementById('select-estado');
    DOM.btnClearFilters      = document.getElementById('btn-limpiar-filtros');
    DOM.contadorResultados   = document.getElementById('contador-resultados');
    DOM.tbodyDocuments       = document.getElementById('tbody-documentos');
    DOM.filaCargando         = document.getElementById('fila-cargando');
    DOM.filaSinDatos         = document.getElementById('fila-sin-datos');
    DOM.filaSinResultados    = document.getElementById('fila-sin-resultados');
    // Panel de detalle
    DOM.detailOverlay        = document.getElementById('detalle-overlay');
    DOM.detailPanel           = document.getElementById('panel-detalle');
    DOM.btnCerrarPanel       = document.getElementById('btn-cerrar-panel');
    DOM.btnDescargarPanel    = document.getElementById('btn-descargar-panel');
    DOM.detailTitulo         = document.getElementById('panel-detalle-titulo');
    DOM.detailCodigo         = document.getElementById('panel-detalle-codigo');
    DOM.detailType           = document.getElementById('detalle-type');
    DOM.detailLevel          = document.getElementById('detalle-level');
    DOM.detailProcess        = document.getElementById('detalle-process');
    DOM.detailStatus         = document.getElementById('detalle-status');
    DOM.detailVersion        = document.getElementById('detalle-version');
    DOM.detailEffectiveDate  = document.getElementById('detalle-effectiveDate');
    DOM.detailCompany        = document.getElementById('detalle-company');
    DOM.detailPreparedBy     = document.getElementById('detalle-preparedBy');
    DOM.detailApprovedBy     = document.getElementById('detalle-approvedBy');
    DOM.detailRetention      = document.getElementById('detalle-retention');
  }

  /** Registra todos los event listeners de la aplicación. @private */
  function _bindEvents() {
    DOM.inputSearch.addEventListener('input', Utils.General.debounce(_applyFilters, 250));
    [DOM.selectProcess, DOM.selectType, DOM.selectCompany, DOM.selectStatus]
      .forEach((select) => select.addEventListener('change', _applyFilters));
    // Banda y nivel acotan las opciones de proceso y tipo
    DOM.selectBand.addEventListener('change', () => { _populateProcessOptions(); _applyFilters(); });
    DOM.selectLevel.addEventListener('change', () => { _populateTypeOptions(); _applyFilters(); });
    DOM.btnClearFilters.addEventListener('click', _clearFilters);

    // Delegación de eventos para los botones de acción de cada fila
    DOM.tbodyDocuments.addEventListener('click', _handleRowAction);

    // Panel de detalle
    DOM.btnCerrarPanel.addEventListener('click', _closeDetailPanel);
    DOM.detailOverlay.addEventListener('click', _closeDetailPanel);
    DOM.btnDescargarPanel.addEventListener('click', () => _handleDownload(state.detailDocument));

    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && DOM.detailPanel.classList.contains('activo')) {
        _closeDetailPanel();
      }
    });
  }


  /* ============================================================
     2. CARGA DE DOCUMENTOS
  ============================================================ */

  /**
   * Carga el listado completo de documentos.
   * En modo demo usa DEMO_DOCUMENTS; en producción llama a Power Automate.
   * @private
   */
  async function _loadDocuments() {
    if (state.loadingDocuments) return;

    state.loadingDocuments = true;
    _showLoadingState();

    try {
      let raw;

      if (CONFIG.MODO_DEMO || CONFIG.URL_DOCUMENTS.startsWith('[')) {
        await Utils.General.wait(600);
        raw = DEMO_DOCUMENTS;  // demo-data.js
        Utils.General.log('Documentos demo cargados:', raw.length);
      } else {
        // Integración real — se implementa en la Fase 5.
        raw = await _callPowerAutomate(CONFIG.URL_DOCUMENTS, 'POST', {});
      }

      state.allDocuments = Utils.Json.normalizeDocuments(raw);
      _populateFilterOptions();
      _applyURLFilters();
      _applyFilters();

    } catch (error) {
      Utils.General.logError('_loadDocuments', error);
      _showEmptyState();
      Utils.Toast.error('No se pudieron cargar los documentos. Verifica la conexión con SharePoint.');
    } finally {
      state.loadingDocuments = false;
    }
  }

  /**
   * Realiza una llamada HTTP a un flujo de Power Automate.
   * Reservado para la Fase 5 (integración real).
   * @private
   */
  async function _callPowerAutomate(url, method = 'POST', body = null) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal:  AbortSignal.timeout(CONFIG.TIMEOUT_MS),
    };

    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const text = await response.text();
    const data = Utils.Json.parseSafe(text);
    if (data === null) throw new Error('La respuesta de Power Automate no es un JSON válido.');

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      if (Array.isArray(data.value)) return data.value;
      if (Array.isArray(data.body))  return data.body;
    }

    return data;
  }

  /* ============================================================
     3. FILTROS Y BÚSQUEDA (todos opcionales y combinables)
  ============================================================ */

  /** Selects de filtro con su parámetro de URL (atributo data-param). @private */
  function _filterSelects() {
    return [DOM.selectProcess, DOM.selectBand, DOM.selectLevel, DOM.selectType, DOM.selectCompany, DOM.selectStatus];
  }

  /** Crea un <option>. @private */
  function _option(value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    return option;
  }

  /** Llena un <select> con su opción "todos" y las opciones dadas, conservando el valor si sigue existiendo. @private */
  function _fillSelect(select, allText, options) {
    const current = select.value;
    select.innerHTML = '';
    select.appendChild(_option('', allText));
    options.forEach((item) => select.appendChild(item));
    select.value = [...select.options].some((o) => o.value === current) ? current : '';
  }

  /** Llena todos los filtros desde catalog.js. @private */
  function _populateFilterOptions() {
    _fillSelect(DOM.selectBand, 'Todas',
      Catalog.BANDS.map((band) => _option(band.code, band.name)));
    _fillSelect(DOM.selectLevel, 'Todos',
      Catalog.LEVELS.map((level) => _option(level.code, `${level.code} · ${level.name}`)));
    // TODAS no es opción: al elegir una empresa se incluyen los documentos de TODAS
    _fillSelect(DOM.selectCompany, 'Todas',
      Catalog.COMPANIES.filter((c) => c !== Catalog.COMPANY_ALL).map((c) => _option(c, Catalog.companyLabel(c))));
    _fillSelect(DOM.selectStatus, 'Todos',
      Utils.Status.ALL.map((st) => _option(st, Utils.Status.label(st))));
    _populateProcessOptions();
    _populateTypeOptions();
  }

  /**
   * Llena el filtro de proceso agrupado por banda ("TAL — Taller"),
   * solo con la banda elegida si hay una. Las siglas de los datos que no
   * están en el catálogo van en "Otros". @private
   */
  function _populateProcessOptions() {
    const bandCode = DOM.selectBand.value;
    const groups = [];

    Catalog.BANDS.filter((band) => !bandCode || band.code === bandCode).forEach((band) => {
      band.groups.forEach((group) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.name ? `${band.name} · ${group.name}` : band.name;
        group.processes.forEach((code) =>
          optgroup.appendChild(_option(code, `${code} — ${Catalog.processName(code)}`)));
        groups.push(optgroup);
      });
    });

    const unknown = Utils.Table.uniqueProcesses(state.allDocuments).filter((code) => !Catalog.bandOf(code));
    if (unknown.length && !bandCode) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Otros';
      unknown.forEach((code) => optgroup.appendChild(_option(code, code)));
      groups.push(optgroup);
    }

    _fillSelect(DOM.selectProcess, 'Todos', groups);
  }

  /** Llena el filtro de tipo ("PR — Procedimiento"), solo con el nivel elegido si hay uno. @private */
  function _populateTypeOptions() {
    const level = Catalog.LEVELS.find((l) => l.code === DOM.selectLevel.value);
    const types = Catalog.TYPES.filter((t) => !level || level.types.includes(t.code));
    _fillSelect(DOM.selectType, 'Todos', types.map((t) => _option(t.code, `${t.code} — ${t.name}`)));
  }

  /**
   * Aplica los filtros que vienen en la URL (?proceso=TAL…). La comparación
   * ignora mayúsculas, tildes y espacios/guiones; también acepta el texto
   * visible de la opción. Los valores que no existen se ignoran con aviso. @private
   */
  function _applyURLFilters() {
    const params = new URLSearchParams(window.location.search);
    const ignored = [];
    const slug = Utils.General.slug;

    const setFrom = (select) => {
      const raw = params.get(select.dataset.param);
      if (raw === null || raw.trim() === '') return;
      const wanted = slug(raw);
      const match = [...select.options].find((o) => o.value &&
        (slug(o.value) === wanted || slug(o.textContent) === wanted ||
         slug(o.textContent.split(/ — | · /).pop()) === wanted));
      if (match) select.value = match.value;
      else ignored.push(`${select.dataset.param}=${raw}`);
    };

    // Banda y nivel primero: acotan las opciones de proceso y tipo
    setFrom(DOM.selectBand);   _populateProcessOptions();
    setFrom(DOM.selectLevel);  _populateTypeOptions();
    [DOM.selectProcess, DOM.selectType, DOM.selectCompany, DOM.selectStatus].forEach(setFrom);

    const keyword = params.get('q');
    if (keyword) DOM.inputSearch.value = keyword;

    if (ignored.length) {
      Utils.Toast.warning(`Se ignoró un filtro de la dirección que no existe: ${ignored.join(', ')}.`);
    }
  }

  /** Refleja los filtros activos en la URL (sin recargar), para compartir el enlace. @private */
  function _syncURL() {
    const params = new URLSearchParams();
    _filterSelects().forEach((select) => {
      if (!select.value) return;
      // Proceso y tipo por su sigla (?proceso=TAL); el resto en forma corta (?estado=en-revision)
      const keepCode = select === DOM.selectProcess || select === DOM.selectType;
      params.set(select.dataset.param, keepCode ? select.value : Utils.General.slug(
        select === DOM.selectLevel ? Catalog.LEVELS.find((l) => l.code === select.value).name : select.value));
    });
    const keyword = DOM.inputSearch.value.trim();
    if (keyword) params.set('q', keyword);
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }

  /** Quita todos los filtros y la búsqueda. @private */
  function _clearFilters() {
    DOM.inputSearch.value = '';
    _filterSelects().forEach((select) => { select.value = ''; });
    _populateProcessOptions();
    _populateTypeOptions();
    _applyFilters();
    DOM.inputSearch.focus();
  }

  /** Aplica búsqueda y filtros sobre state.allDocuments y renderiza el resultado. @private */
  function _applyFilters() {
    const f = {
      process: DOM.selectProcess.value,
      band:    DOM.selectBand.value,
      level:   DOM.selectLevel.value,
      type:    DOM.selectType.value,
      company: DOM.selectCompany.value,
      status:  DOM.selectStatus.value,
    };

    let results = state.allDocuments.filter((doc) =>
      (!f.process || doc.process === f.process) &&
      (!f.band    || doc.band === f.band) &&
      (!f.level   || doc.level === f.level) &&
      (!f.type    || doc.type === f.type) &&
      // Empresa: la elegida o TODAS (aplica a las tres)
      (!f.company || doc.company === f.company || doc.company === Catalog.COMPANY_ALL) &&
      (!f.status  || doc.status === f.status));

    results = Utils.Table.filterByKeyword(results, DOM.inputSearch.value);

    state.visibleDocuments = results;
    _renderTable(results);
    _updateResultsCount(results.length);
    _syncURL();
  }

  /** Actualiza el contador de resultados en la barra de búsqueda. @private */
  function _updateResultsCount(count) {
    DOM.contadorResultados.textContent = String(count);
  }


  /* ============================================================
     4. CONSTRUCCIÓN DE LA TABLA
  ============================================================ */

  /** Construye y renderiza las filas de la tabla en el DOM. @private */
  function _renderTable(documents) {
    _clearDataRows();
    _hideAllStateRows();

    if (documents.length === 0) {
      _showNoResultsState();
      return;
    }

    const fragment = document.createDocumentFragment();
    documents.forEach((doc) => fragment.appendChild(_createRow(doc)));
    DOM.tbodyDocuments.insertBefore(fragment, DOM.filaCargando);
  }

  /**
   * Crea el elemento <tr> para un documento.
   * Columnas: Código · Nombre del documento · Tipo · Proceso · Estado · Acciones
   * @private
   */
  function _createRow(doc) {
    const row = document.createElement('tr');
    row.className = 'tabla__fila';
    row.dataset.id = doc._id;

    const escape = Utils.General.escapeHTML;
    const statusClass  = Utils.Status.badgeClass(doc.status);
    const canDownload  = Utils.Status.isDownloadable(doc.status);
    const downloadAttrs = canDownload
      ? ''
      : `disabled aria-disabled="true" title="Solo se pueden descargar documentos en estado &quot;${Utils.Status.label(Utils.Status.VIGENTE)}&quot;."`;

    row.innerHTML = `
      <td class="tabla__td tabla__td--codigo">${escape(doc.code)}</td>
      <td class="tabla__td tabla__td--nombre">${escape(doc.documentName)}</td>
      <td class="tabla__td tabla__td--tipo">${escape(Catalog.typeName(doc.type))}</td>
      <td class="tabla__td tabla__td--proceso">${escape(doc.process)}</td>
      <td class="tabla__td tabla__td--estado">
        <span class="badge-estado ${statusClass}">${escape(Utils.Status.label(doc.status))}</span>
      </td>
      <td class="tabla__td tabla__td--acciones">
        <div class="tabla__acciones">
          <button type="button" class="btn btn--secundario btn--sm" data-action="detail" data-id="${doc._id}">
            Ver más
          </button>
          <button type="button" class="btn btn--primario btn--sm" data-action="download" data-id="${doc._id}" ${downloadAttrs}>
            Descargar
          </button>
        </div>
      </td>
    `;

    return row;
  }

  /**
   * Maneja los clics en los botones de acción de cada fila
   * (delegación de eventos sobre el tbody).
   * "Ver más" abre el panel de detalle; la descarga real se implementa
   * en la Fase 3 (por ahora queda como acción pendiente).
   * @private
   */
  function _handleRowAction(evento) {
    const button = evento.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const doc = state.visibleDocuments.find((d) => d._id === button.dataset.id);
    if (!doc) return;

    if (action === 'detail') {
      _openDetailPanel(doc, button);
    } else if (action === 'download') {
      _handleDownload(doc);
    }
  }

  /**
   * Descarga el documento usando su columna `location` (Ubicación).
   * @private
   */
  function _handleDownload(doc) {
    if (!doc) return;

    // Guarda defensiva: el botón ya está deshabilitado para estos casos,
    // pero se valida también aquí por si se dispara la acción por otra vía.
    if (!Utils.Status.isDownloadable(doc.status)) {
      Utils.Toast.warning(
        `Solo se pueden descargar documentos en estado "${Utils.Status.label(Utils.Status.VIGENTE)}". "${doc.documentName}" está en estado "${Utils.Status.label(doc.status)}".`
      );
      return;
    }

    if (!doc.location) {
      Utils.Toast.warning(`"${doc.documentName}" no tiene una ubicación de descarga configurada.`);
      return;
    }

    Utils.General.downloadFromURL(doc.location, _buildDownloadFilename(doc));
    Utils.Toast.success(`Descargando "${doc.documentName}"...`);
  }

  /**
   * Construye el nombre de archivo sugerido para la descarga,
   * conservando la extensión de `location` cuando es reconocible.
   * @private
   */
  function _buildDownloadFilename(doc) {
    const extMatch = doc.location.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
    const extension = extMatch ? `.${extMatch[1]}` : '';
    const safeName = doc.documentName.replace(/[\\/:*?"<>|]/g, '').trim();
    return `${doc.code}_${safeName}${extension}`;
  }


  /* ============================================================
     5. PANEL DE DETALLE (overlay + aside deslizante)
  ============================================================ */

  /**
   * Abre el panel de detalle con la información del documento.
   * @private
   * @param {Object} doc — documento a mostrar
   * @param {HTMLElement} [triggerElement] — elemento que disparó la apertura,
   *   para devolverle el foco al cerrar
   */
  function _openDetailPanel(doc, triggerElement) {
    state.detailDocument = doc;
    state.lastFocusedElement = triggerElement ?? document.activeElement;

    DOM.detailTitulo.textContent      = doc.documentName;
    DOM.detailCodigo.textContent      = doc.code;
    DOM.detailType.textContent        = Catalog.typeName(doc.type) || '—';
    const level = Catalog.levelOf(doc.type);
    DOM.detailLevel.textContent       = level ? `${level.name} (nivel ${level.code})` : '—';
    DOM.detailProcess.textContent     = doc.process || '—';
    DOM.detailStatus.textContent      = Utils.Status.label(doc.status) || '—';
    DOM.detailStatus.className        = `badge-estado ${Utils.Status.badgeClass(doc.status)}`;
    DOM.detailVersion.textContent     = doc.version || '—';
    DOM.detailEffectiveDate.textContent = Utils.Format.dateLong(doc.effectiveDate) || '—';
    DOM.detailCompany.textContent     = doc.company || '—';
    DOM.detailPreparedBy.textContent  = doc.preparedBy || '—';
    DOM.detailApprovedBy.textContent  = doc.approvedBy || '—';
    DOM.detailRetention.textContent   =
      Utils.Format.retention(doc.retentionManagementYears, doc.retentionCentralYears) || '—';

    const canDownload = Utils.Status.isDownloadable(doc.status);
    DOM.btnDescargarPanel.disabled = !canDownload;
    DOM.btnDescargarPanel.setAttribute('aria-disabled', String(!canDownload));
    DOM.btnDescargarPanel.title = canDownload
      ? ''
      : `Solo se pueden descargar documentos en estado "${Utils.Status.label(Utils.Status.VIGENTE)}".`;

    DOM.detailOverlay.classList.add('activo');
    DOM.detailOverlay.setAttribute('aria-hidden', 'false');
    DOM.detailPanel.classList.add('activo');
    DOM.detailPanel.setAttribute('aria-hidden', 'false');

    document.body.classList.add('sin-scroll');
    setTimeout(() => DOM.btnCerrarPanel.focus(), 50);
  }

  /**
   * Cierra el panel de detalle y devuelve el foco al elemento que lo abrió.
   * @private
   */
  function _closeDetailPanel() {
    DOM.detailOverlay.classList.remove('activo');
    DOM.detailOverlay.setAttribute('aria-hidden', 'true');
    DOM.detailPanel.classList.remove('activo');
    DOM.detailPanel.setAttribute('aria-hidden', 'true');

    document.body.classList.remove('sin-scroll');

    state.detailDocument = null;
    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === 'function') {
      state.lastFocusedElement.focus();
    }
    state.lastFocusedElement = null;
  }


  /* ============================================================
     6. ESTADOS DE LA TABLA
  ============================================================ */

  function _showLoadingState() {
    _hideAllStateRows();
    DOM.filaCargando.classList.remove('tabla__fila-estado--oculta');
  }

  function _showEmptyState() {
    _hideAllStateRows();
    DOM.filaSinDatos.classList.remove('tabla__fila-estado--oculta');
  }

  function _showNoResultsState() {
    _hideAllStateRows();
    DOM.filaSinResultados.classList.remove('tabla__fila-estado--oculta');
  }

  function _hideAllStateRows() {
    DOM.filaCargando.classList.add('tabla__fila-estado--oculta');
    DOM.filaSinDatos.classList.add('tabla__fila-estado--oculta');
    DOM.filaSinResultados.classList.add('tabla__fila-estado--oculta');
  }

  function _clearDataRows() {
    DOM.tbodyDocuments.querySelectorAll('tr.tabla__fila').forEach((row) => row.remove());
  }


  /* ============================================================
     API PÚBLICA
  ============================================================ */
  return { init };

})();


/* ================================================================
   PUNTO DE ENTRADA
================================================================ */
document.addEventListener('DOMContentLoaded', App.init);
