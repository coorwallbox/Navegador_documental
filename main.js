/* ================================================================
   CONSULTA DOCUMENTAL
   main.js · Fase 1 · 2026
   Módulo principal de la aplicación.
   Depende de: config.js, catalog.js, utils.js y demo-data.js (deben cargarse antes en el HTML)

   Flujo:
     1. DOMContentLoaded → App.init()
     2. Carga automática de documentos (modo demo o Power Automate)
     3. Los filtros se llenan desde catalog.js y se aplican los de la URL
        (?proceso=TAL&banda=…&nivel=…&tipo=…&empresa=…&estado=…&revision=…&q=…)
     4. Usuario busca por nombre o código y combina filtros; la tabla
        y la URL se actualizan en vivo
================================================================ */

const App = (() => {

  'use strict';

  /* ============================================================
     CONFIGURACIÓN
  ============================================================ */
  const CONFIG = {
    // Modo demo: sin URL de F1 en config.js se usan los datos de demo-data.js (Utils.Data)
    MODO_DEMO: Utils.Data.isDemo(),
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
    Utils.Dialog.init();
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
    DOM.selectReview         = document.getElementById('select-revision');
    DOM.btnClearFilters      = document.getElementById('btn-limpiar-filtros');
    DOM.contadorResultados   = document.getElementById('contador-resultados');
    DOM.tbodyDocuments       = document.getElementById('tbody-documentos');
    DOM.filaCargando         = document.getElementById('fila-cargando');
    DOM.filaSinDatos         = document.getElementById('fila-sin-datos');
    DOM.filaSinResultados    = document.getElementById('fila-sin-resultados');
    // Panel de detalle
    DOM.detailPanel           = document.getElementById('panel-detalle');
    DOM.btnCerrarPanel       = document.getElementById('btn-cerrar-panel');
    DOM.btnOpenPanel         = document.getElementById('btn-abrir-panel');
    DOM.detailBody           = document.getElementById('panel-detalle-cuerpo');
    DOM.detailNotice         = document.getElementById('panel-detalle-aviso');
    DOM.detailTitulo         = document.getElementById('panel-detalle-titulo');
    DOM.detailCodigo         = document.getElementById('panel-detalle-codigo');
  }

  /** Registra todos los event listeners de la aplicación. @private */
  function _bindEvents() {
    DOM.inputSearch.addEventListener('input', Utils.General.debounce(_applyFilters, 250));
    [DOM.selectProcess, DOM.selectType, DOM.selectCompany, DOM.selectStatus, DOM.selectReview]
      .forEach((select) => select.addEventListener('change', _applyFilters));
    // Banda y nivel acotan las opciones de proceso y tipo
    DOM.selectBand.addEventListener('change', () => { _populateProcessOptions(); _applyFilters(); });
    DOM.selectLevel.addEventListener('change', () => { _populateTypeOptions(); _applyFilters(); });
    DOM.btnClearFilters.addEventListener('click', _clearFilters);

    // Delegación de eventos para los botones de acción de cada fila
    DOM.tbodyDocuments.addEventListener('click', _handleRowAction);

    // Panel de detalle
    DOM.btnCerrarPanel.addEventListener('click', _closeDetailPanel);
    DOM.btnOpenPanel.addEventListener('click', () => _handleOpen(state.detailDocument));
    // Anexos, documento principal y variantes: abren su detalle en el mismo panel
    DOM.detailBody.addEventListener('click', (evento) => {
      const link = evento.target.closest('[data-doc-id]');
      const doc = link && state.allDocuments.find((d) => d._id === link.dataset.docId);
      if (doc) _showDetail(doc, true);
    });

    // Overlay, Esc y foco atrapado: Utils.Dialog
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
      // Demo (demo-data.js) o flujo F1 de Power Automate, según config.js
      state.allDocuments = await Utils.Data.loadDocuments();
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

  /* ============================================================
     3. FILTROS Y BÚSQUEDA (todos opcionales y combinables)
  ============================================================ */

  /** Selects de filtro con su parámetro de URL (atributo data-param). @private */
  function _filterSelects() {
    return [DOM.selectProcess, DOM.selectBand, DOM.selectLevel, DOM.selectType, DOM.selectCompany, DOM.selectStatus,
      DOM.selectReview];
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

  /** Opciones del filtro de revisión periódica (el valor va tal cual a la URL). */
  const REVIEW_OPTIONS = [
    { value: 'vencida', text: 'Vencida' },
    { value: 'al-dia',  text: 'Al día' },
  ];

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
    // Revisión periódica (Fase 12): solo aplica a documentos vigentes
    _fillSelect(DOM.selectReview, 'Todas', REVIEW_OPTIONS.map((o) => _option(o.value, o.text)));
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
    [DOM.selectProcess, DOM.selectType, DOM.selectCompany, DOM.selectStatus, DOM.selectReview].forEach(setFrom);

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
      review:  DOM.selectReview.value,
    };

    let results = state.allDocuments.filter((doc) =>
      (!f.process || doc.process === f.process) &&
      (!f.band    || doc.band === f.band) &&
      (!f.level   || doc.level === f.level) &&
      (!f.type    || doc.type === f.type) &&
      // Empresa: la elegida o TODAS (aplica a las tres)
      (!f.company || doc.company === f.company || doc.company === Catalog.COMPANY_ALL) &&
      (!f.status  || doc.status === f.status) &&
      // Revisión periódica: vencida, o al día (vigente sin vencer)
      (!f.review  || (f.review === 'vencida'
        ? doc.reviewOverdue
        : doc.status === Utils.Status.VIGENTE && !doc.reviewOverdue)));

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
   * Columnas: Código · Nombre · Tipo · Proceso · Versión · Empresa · Estado · Acciones
   * @private
   */
  function _createRow(doc) {
    const row = document.createElement('tr');
    row.className = 'tabla__fila';
    row.dataset.id = doc._id;

    const escape = Utils.General.escapeHTML;
    const statusClass = Utils.Status.badgeClass(doc.status);
    const access = Utils.Access.check(doc);
    const openAttrs = access.allowed
      ? ''
      : `disabled aria-disabled="true" title="${escape(access.text)}"`;

    row.innerHTML = `
      <td class="tabla__td tabla__td--codigo">${escape(doc.code)}</td>
      <td class="tabla__td tabla__td--nombre">${escape(doc.documentName)}</td>
      <td class="tabla__td tabla__td--tipo">${escape(Catalog.typeName(doc.type))}</td>
      <td class="tabla__td tabla__td--proceso">${escape(doc.process)}</td>
      <td class="tabla__td tabla__td--version">${escape(doc.version)}</td>
      <td class="tabla__td tabla__td--empresa">${escape(Catalog.companyLabel(doc.company))}</td>
      <td class="tabla__td tabla__td--estado">
        <span class="badge-estado ${statusClass}">${escape(Utils.Status.label(doc.status))}</span>
      </td>
      <td class="tabla__td tabla__td--acciones">
        <div class="tabla__acciones">
          <button type="button" class="btn btn--secundario btn--sm" data-action="detail" data-id="${doc._id}">
            Ver más
          </button>
          <button type="button" class="btn btn--primario btn--sm" data-action="open" data-id="${doc._id}"
            aria-label="${_fileActionLabel(doc)} ${escape(doc.code)}" ${openAttrs}>
            ${_fileActionLabel(doc)}
          </button>
        </div>
      </td>
    `;

    return row;
  }

  /** Aviso de un documento EN REVISIÓN: la versión actual sigue vigente mientras se decide. @private */
  function _inReviewText(doc) {
    const until = doc.reviewDeadline ? ` hasta el ${Utils.Format.dateLong(doc.reviewDeadline)}` : '';
    return `Cambio en trámite${until}: esta versión sigue vigente hasta que se apruebe la nueva.`;
  }

  /** Texto del botón del archivo: "Abrir" (PDF o sin extensión) o "Descargar" (otros formatos). @private */
  function _fileActionLabel(doc) {
    return Utils.General.fileAction(doc.location) === 'download' ? 'Descargar' : 'Abrir';
  }

  /**
   * Maneja los clics en los botones de acción de cada fila
   * (delegación de eventos sobre el tbody): "Ver más" y "Abrir".
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
    } else if (action === 'open') {
      _handleOpen(doc);
    }
  }

  /**
   * Abre (PDF, en pestaña nueva) o descarga (otros formatos) el archivo de UBICACIÓN.
   * Solo VIGENTE o EN REVISIÓN (con aviso) y no reservados (Utils.Access);
   * aviso si no tiene UBICACIÓN.
   * (data-action="open" cubre ambas acciones.)
   * @private
   */
  function _handleOpen(doc) {
    if (!doc) return;

    // Guarda defensiva: el botón ya está deshabilitado para estos casos,
    // pero se valida también aquí por si se dispara la acción por otra vía.
    const access = Utils.Access.check(doc);
    if (!access.allowed) {
      Utils.Toast.warning(access.reason === 'reserved'
        ? `"${doc.documentName}" (${doc.code}): ${access.text}`
        : `${access.text} "${doc.documentName}" está en estado "${Utils.Status.label(doc.status)}".`);
      return;
    }

    if (!doc.location) {
      Utils.Toast.warning(`"${doc.documentName}" (${doc.code}) no tiene UBICACIÓN en el listado maestro. Avisa a Sistemas de Gestión.`);
      return;
    }

    // EN REVISIÓN: se abre, pero se avisa que hay un cambio en trámite
    if (doc.status === Utils.Status.EN_REVISION) Utils.Toast.warning(_inReviewText(doc), 7000);

    const download = Utils.General.fileAction(doc.location) === 'download';

    // Modo demo: las ubicaciones de ejemplo no existen; se simula la acción
    if (doc.location.startsWith('#demo/')) {
      Utils.Toast.info(`Modo demo: se ${download ? 'descargaría' : 'abriría'} "${doc.location.slice(6)}".`);
      return;
    }

    if (download) {
      Utils.General.downloadURL(doc.location);
      Utils.Toast.success(`Descargando "${doc.documentName}". Toda copia descargada es una copia no controlada.`);
    } else {
      Utils.General.openURL(doc.location);
      Utils.Toast.success(`Abriendo "${doc.documentName}"...`);
    }
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
    _showDetail(doc, false);
    Utils.Dialog.open(DOM.detailPanel, {
      initialFocus: DOM.btnCerrarPanel,
      returnFocus: triggerElement,
      onClose: () => {
        DOM.detailTitulo.removeAttribute('tabindex');
        state.detailDocument = null;
      },
    });
  }

  /**
   * Muestra un documento en el panel (al abrirlo o al navegar a un anexo,
   * al documento principal o a una variante).
   * @private
   * @param {Object} doc
   * @param {boolean} fromNavigation — true si viene de un enlace del panel
   */
  function _showDetail(doc, fromNavigation) {
    state.detailDocument = doc;
    DOM.detailTitulo.textContent = doc.documentName;
    DOM.detailCodigo.textContent = doc.code;
    _renderDetailBody(doc);

    const access = Utils.Access.check(doc);
    DOM.btnOpenPanel.disabled = !access.allowed;
    DOM.btnOpenPanel.setAttribute('aria-disabled', String(!access.allowed));
    DOM.btnOpenPanel.title = access.text;
    DOM.btnOpenPanel.textContent = _fileActionLabel(doc);

    // Aviso visible en el pie: no se puede abrir (estado o reservado), sin UBICACIÓN o cambio en trámite
    let notice = '';
    if (!access.allowed) notice = access.text;
    else if (!doc.location) notice = `${Utils.Status.label(doc.status)} sin UBICACIÓN registrada.`;
    else if (doc.status === Utils.Status.EN_REVISION) notice = _inReviewText(doc);
    DOM.detailNotice.textContent = notice;
    DOM.detailNotice.hidden = !notice;

    if (fromNavigation) {
      DOM.detailBody.scrollTop = 0;
      DOM.detailTitulo.setAttribute('tabindex', '-1');
      DOM.detailTitulo.focus();
    }
  }

  /** Documentos relacionados: principal (si es anexo), anexos y variantes por empresa. @private */
  function _relatedDocuments(doc) {
    const all = state.allDocuments;
    // Principal: si tiene variantes, la de la misma empresa o la de TODAS
    const parents = doc.parentCode ? all.filter((d) => d.code === doc.parentCode) : [];
    const parent = parents.find((d) => d.company === doc.company)
      || parents.find((d) => d.company === Catalog.COMPANY_ALL) || parents[0] || null;
    // Anexos: uno por código (si el anexo tiene variantes se navega a ellas desde su detalle)
    const annexes = all.filter((d) => d.parentCode === doc.code)
      .filter((d, i, list) => list.findIndex((x) => x.code === d.code) === i);
    const variants = all.filter((d) => d.code === doc.code && d._id !== doc._id);
    return { parent, annexes, variants };
  }

  /** Construye las secciones del panel de detalle. @private */
  function _renderDetailBody(doc) {
    const escape = Utils.General.escapeHTML;
    const dash = '—';
    const level = Catalog.levelOf(doc.type);
    const processName = Catalog.processName(doc.process);
    const band = Catalog.BANDS.find((b) => b.code === doc.band);
    const deadlinePast = Utils.Format.isPast(doc.reviewDeadline);
    const external = Catalog.isExternal(doc.type);
    const reviewYears = Catalog.reviewYears(doc.type);
    const { parent, annexes, variants } = _relatedDocuments(doc);

    const text = (value) => escape(value || dash);
    const docLink = (d, label) =>
      `<button type="button" class="panel-detalle__enlace" data-doc-id="${d._id}">${escape(label)}</button>`;
    const linkList = (docs, labelOf, emptyText) => docs.length
      ? `<ul class="panel-detalle__lista">${docs.map((d) => `<li>${docLink(d, labelOf(d))}</li>`).join('')}</ul>`
      : escape(emptyText);

    // Próxima revisión periódica (FECHA DE VIGENCIA + periodo del tipo); «Vencida» solo en vigentes
    const nextReview = doc.nextReviewDate
      ? `${escape(Utils.Format.dateLong(doc.nextReviewDate))} <span class="panel-detalle__nota">(cada ${reviewYears === 1 ? 'año' : `${reviewYears} años`})</span>${doc.reviewOverdue
        ? ' <span class="badge-vencida">Vencida</span>' : ''}`
      : dash;

    const deadline = doc.reviewDeadline
      ? `${escape(Utils.Format.dateLong(doc.reviewDeadline))}${deadlinePast
        ? ' <span class="badge-vencida">Vencida</span>' : ''}`
      : dash;

    // [título de sección, [[clave, etiqueta, html del valor]]]
    const sections = [
      ['Identificación', [
        ['type',    'Tipo',              text(doc.type ? `${doc.type} — ${Catalog.typeName(doc.type)}` : '')],
        ['level',   'Nivel documental',  text(level ? `${level.name} (nivel ${level.code})` : '')],
        ['process', 'Proceso',           text(processName ? `${doc.process} — ${processName}` : doc.process)],
        ['band',    'Banda del mapa',    text(band ? band.name : doc.band)],
        ['company', 'Empresa',           text(Catalog.companyLabel(doc.company))],
        ['origin',  'Origen',            external ? 'Externo' : 'Interno'],
        ...(external ? [['issuer', 'Emisor', text(doc.issuer)]] : []),
        ['classification', 'Clasificación',
          doc.classification === Catalog.CLASSIFICATION_RESERVED ? 'Reservada' : 'Interna'],
      ]],
      ['Vigencia', [
        ['status',         'Estado',                   `<span class="badge-estado ${Utils.Status.badgeClass(doc.status)}">${text(Utils.Status.label(doc.status))}</span>`],
        ['version',        'Versión',                  text(doc.version)],
        ['effectiveDate',  'Fecha de vigencia',        text(Utils.Format.dateLong(doc.effectiveDate))],
        ['reviewDeadline', 'Fecha límite de revisión', deadline],
        ['nextReviewDate', 'Próxima revisión periódica', nextReview],
      ]],
      ['Responsables', [
        ['preparedBy', 'Cargo que elabora', text(doc.preparedBy)],
        ['approvedBy', 'Cargo que aprueba', text(doc.approvedBy)],
      ]],
      ['Retención', [
        ['retention',        'Tiempo de retención',        text(Utils.Format.retention(doc.retentionManagementYears, doc.retentionCentralYears))],
        ['finalDisposition', 'Disposición final',          text(doc.finalDisposition)],
        ['retentionBasis',   'Fundamento de la retención', text(doc.retentionBasis)],
      ]],
      ['Documentos relacionados', [
        ['parentCode', 'Documento principal',
          parent ? docLink(parent, `${parent.code} · ${parent.documentName}`) : text(doc.parentCode)],
        ['annexes', 'Anexos', linkList(annexes, (d) => `${d.code} · ${d.documentName}`, 'Ninguno')],
        ['variants', 'Variantes por empresa',
          linkList(variants, (d) => `${Catalog.companyLabel(d.company)} · versión ${d.version || dash}`, 'Ninguna')],
      ]],
      ['Control de cambios y observaciones', [
        ['changeLog', 'Control de cambios', text(doc.changeLog)],
        ['notes',     'Observaciones',      text(doc.notes)],
      ]],
    ];

    DOM.detailBody.innerHTML = sections.map(([title, fields]) => `
      <section class="panel-detalle__seccion">
        <h3 class="panel-detalle__seccion-titulo">${escape(title)}</h3>
        ${fields.map(([key, label, value]) => `
          <div class="panel-detalle__campo">
            <span class="panel-detalle__etiqueta">${escape(label)}</span>
            <div id="detalle-${key}" class="panel-detalle__valor">${value}</div>
          </div>`).join('')}
      </section>`).join('');

    const deadlineField = document.getElementById('detalle-reviewDeadline');
    if (deadlinePast) deadlineField.classList.add('panel-detalle__valor--vencida');
    if (doc.reviewOverdue) document.getElementById('detalle-nextReviewDate').classList.add('panel-detalle__valor--vencida');
  }

  /**
   * Cierra el panel de detalle y devuelve el foco al elemento que lo abrió.
   * @private
   */
  function _closeDetailPanel() {
    Utils.Dialog.close();
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
