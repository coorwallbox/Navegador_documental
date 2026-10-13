/* ================================================================
   CONSULTA DOCUMENTAL
   main.js · Fase 1 · 2026
   Módulo principal de la aplicación.
   Depende de: utils.js (debe cargarse antes en el HTML)

   Flujo Fase 1:
     1. DOMContentLoaded → App.init()
     2. Carga automática de documentos (modo demo o Power Automate)
     3. Usuario busca por nombre del documento y/o filtra por proceso
        (filtro opcional, se combina con la búsqueda)
     4. Tabla se actualiza en vivo con los resultados

   Nota: los botones "Ver detalle" y "Descargar" de cada fila quedan
   como estructura visual — su comportamiento se implementa en las
   Fases 2 y 3 (ver docs/06_IMPLEMENTATION.md).
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
     DATOS DE PRUEBA (MODO DEMO)
     Simulan la respuesta del Excel en SharePoint, con los nombres
     de columna reales tal como los normaliza Utils.Json.
  ============================================================ */
  const DEMO_DOCUMENTS = [
    { 'Código': 'PR-COM-001', 'Nombre del documento': 'Procedimiento de compras nacionales', 'Tipo': 'Procedimiento', 'Proceso': 'Compras', 'Versión': '3', 'Fecha de emisión': '2025-02-10', 'Fecha de aprobación': '2025-02-18', 'Responsable': 'Ana Martínez', 'Estado': 'Vigente', 'Ubicación': '#demo/PR-COM-001.pdf', 'Usuarios o áreas aplicables': 'Compras, Almacén', 'Tiempo de retención': '5 años' },
    { 'Código': 'IN-COM-004', 'Nombre del documento': 'Instructivo de selección de proveedores', 'Tipo': 'Instructivo', 'Proceso': 'Compras', 'Versión': '2', 'Fecha de emisión': '2024-11-05', 'Fecha de aprobación': '2024-11-12', 'Responsable': 'Ana Martínez', 'Estado': 'Desactualizado', 'Ubicación': '#demo/IN-COM-004.pdf', 'Usuarios o áreas aplicables': 'Compras', 'Tiempo de retención': '3 años' },
    { 'Código': 'FO-CAL-012', 'Nombre del documento': 'Formato de inspección de calidad', 'Tipo': 'Formato', 'Proceso': 'Calidad', 'Versión': '5', 'Fecha de emisión': '2025-06-01', 'Fecha de aprobación': '2025-06-08', 'Responsable': 'Carlos Rojas', 'Estado': 'Vigente', 'Ubicación': '#demo/FO-CAL-012.pdf', 'Usuarios o áreas aplicables': 'Calidad, Producción', 'Tiempo de retención': '10 años' },
    { 'Código': 'PR-CAL-002', 'Nombre del documento': 'Procedimiento de no conformidades', 'Tipo': 'Procedimiento', 'Proceso': 'Calidad', 'Versión': '4', 'Fecha de emisión': '2024-09-14', 'Fecha de aprobación': '2024-09-20', 'Responsable': 'Carlos Rojas', 'Estado': 'En revisión', 'Ubicación': '#demo/PR-CAL-002.pdf', 'Usuarios o áreas aplicables': 'Calidad', 'Tiempo de retención': '10 años' },
    { 'Código': 'MA-CAL-001', 'Nombre del documento': 'Manual de gestión de calidad', 'Tipo': 'Manual', 'Proceso': 'Calidad', 'Versión': '7', 'Fecha de emisión': '2023-01-20', 'Fecha de aprobación': '2023-02-01', 'Responsable': 'Carlos Rojas', 'Estado': 'Vigente', 'Ubicación': '#demo/MA-CAL-001.pdf', 'Usuarios o áreas aplicables': 'Toda la organización', 'Tiempo de retención': 'Permanente' },
    { 'Código': 'PO-RRHH-001', 'Nombre del documento': 'Política de vinculación de personal', 'Tipo': 'Política', 'Proceso': 'Recursos Humanos', 'Versión': '2', 'Fecha de emisión': '2024-03-11', 'Fecha de aprobación': '2024-03-15', 'Responsable': 'Laura Gómez', 'Estado': 'Anulado', 'Ubicación': '#demo/PO-RRHH-001.pdf', 'Usuarios o áreas aplicables': 'Recursos Humanos', 'Tiempo de retención': '5 años' },
    { 'Código': 'FO-RRHH-018', 'Nombre del documento': 'Formato de evaluación de desempeño', 'Tipo': 'Formato', 'Proceso': 'Recursos Humanos', 'Versión': '3', 'Fecha de emisión': '2025-01-08', 'Fecha de aprobación': '2025-01-15', 'Responsable': 'Laura Gómez', 'Estado': 'Vigente', 'Ubicación': '#demo/FO-RRHH-018.pdf', 'Usuarios o áreas aplicables': 'Toda la organización', 'Tiempo de retención': '5 años' },
    { 'Código': 'IN-PROD-007', 'Nombre del documento': 'Instructivo de operación de línea de ensamble', 'Tipo': 'Instructivo', 'Proceso': 'Producción', 'Versión': '6', 'Fecha de emisión': '2025-04-22', 'Fecha de aprobación': '2025-04-29', 'Responsable': 'Jorge Peña', 'Estado': 'Vigente', 'Ubicación': '#demo/IN-PROD-007.pdf', 'Usuarios o áreas aplicables': 'Producción', 'Tiempo de retención': '3 años' },
    { 'Código': 'PR-PROD-003', 'Nombre del documento': 'Procedimiento de mantenimiento preventivo', 'Tipo': 'Procedimiento', 'Proceso': 'Producción', 'Versión': '2', 'Fecha de emisión': '2024-07-02', 'Fecha de aprobación': '2024-07-10', 'Responsable': 'Jorge Peña', 'Estado': 'Obsoleto', 'Ubicación': '#demo/PR-PROD-003.pdf', 'Usuarios o áreas aplicables': 'Producción, Mantenimiento', 'Tiempo de retención': '3 años' },
    { 'Código': 'FO-SST-005', 'Nombre del documento': 'Formato de inspección de seguridad', 'Tipo': 'Formato', 'Proceso': 'Seguridad y Salud en el Trabajo', 'Versión': '4', 'Fecha de emisión': '2025-05-19', 'Fecha de aprobación': '2025-05-26', 'Responsable': 'Diana Torres', 'Estado': 'Vigente', 'Ubicación': '#demo/FO-SST-005.pdf', 'Usuarios o áreas aplicables': 'Toda la organización', 'Tiempo de retención': '20 años' },
    { 'Código': 'PR-SST-002', 'Nombre del documento': 'Procedimiento de reporte de incidentes', 'Tipo': 'Procedimiento', 'Proceso': 'Seguridad y Salud en el Trabajo', 'Versión': '3', 'Fecha de emisión': '2024-12-01', 'Fecha de aprobación': '2024-12-09', 'Responsable': 'Diana Torres', 'Estado': 'Vigente', 'Ubicación': '#demo/PR-SST-002.pdf', 'Usuarios o áreas aplicables': 'Toda la organización', 'Tiempo de retención': '20 años' },
    { 'Código': 'MA-SST-001', 'Nombre del documento': 'Manual del sistema de gestión SST', 'Tipo': 'Manual', 'Proceso': 'Seguridad y Salud en el Trabajo', 'Versión': '5', 'Fecha de emisión': '2023-08-14', 'Fecha de aprobación': '2023-08-21', 'Responsable': 'Diana Torres', 'Estado': 'Vigente', 'Ubicación': '#demo/MA-SST-001.pdf', 'Usuarios o áreas aplicables': 'Toda la organización', 'Tiempo de retención': 'Permanente' },
  ];


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
    DOM.detailProcess        = document.getElementById('detalle-process');
    DOM.detailStatus         = document.getElementById('detalle-status');
    DOM.detailVersion        = document.getElementById('detalle-version');
    DOM.detailIssueDate      = document.getElementById('detalle-issueDate');
    DOM.detailApprovalDate   = document.getElementById('detalle-approvalDate');
    DOM.detailOwner          = document.getElementById('detalle-owner');
    DOM.detailApplicable     = document.getElementById('detalle-applicableAreas');
    DOM.detailRetention      = document.getElementById('detalle-retentionTime');
  }

  /** Registra todos los event listeners de la aplicación. @private */
  function _bindEvents() {
    DOM.inputSearch.addEventListener('input', Utils.General.debounce(_applyFilters, 250));
    DOM.selectProcess.addEventListener('change', _applyFilters);

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
        raw = DEMO_DOCUMENTS;
        Utils.General.log('Documentos demo cargados:', raw.length);
      } else {
        // Integración real — se implementa en la Fase 5.
        raw = await _callPowerAutomate(CONFIG.URL_DOCUMENTS, 'POST', {});
      }

      state.allDocuments = Utils.Json.normalizeDocuments(raw);
      _populateProcessOptions(state.allDocuments);
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

  /**
   * Puebla el <select> de proceso con los valores únicos presentes
   * en los documentos cargados.
   * @private
   */
  function _populateProcessOptions(documents) {
    const processes = Utils.Table.uniqueProcesses(documents);
    const currentValue = DOM.selectProcess.value;

    DOM.selectProcess.innerHTML = '<option value="">Todos los procesos</option>';
    processes.forEach((process) => {
      const option = document.createElement('option');
      option.value = process;
      option.textContent = process;
      DOM.selectProcess.appendChild(option);
    });

    if (processes.includes(currentValue)) DOM.selectProcess.value = currentValue;
  }


  /* ============================================================
     3. BÚSQUEDA Y FILTRO (se combinan)
  ============================================================ */

  /**
   * Aplica la búsqueda por palabra clave y el filtro de proceso
   * (ambos opcionales y combinables) sobre state.allDocuments,
   * y renderiza el resultado.
   * @private
   */
  function _applyFilters() {
    const keyword = DOM.inputSearch.value;
    const process = DOM.selectProcess.value;

    let results = state.allDocuments;

    if (process) {
      results = results.filter((doc) => doc.process === process);
    }

    results = Utils.Table.filterByKeyword(results, keyword);

    state.visibleDocuments = results;
    _renderTable(results);
    _updateResultsCount(results.length);
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
      : `disabled aria-disabled="true" title="Solo se pueden descargar documentos en estado &quot;${Utils.Status.VIGENTE}&quot;."`;

    row.innerHTML = `
      <td class="tabla__td tabla__td--codigo">${escape(doc.code)}</td>
      <td class="tabla__td tabla__td--nombre">${escape(doc.documentName)}</td>
      <td class="tabla__td tabla__td--tipo">${escape(doc.type)}</td>
      <td class="tabla__td tabla__td--proceso">${escape(doc.process)}</td>
      <td class="tabla__td tabla__td--estado">
        <span class="badge-estado ${statusClass}">${escape(doc.status)}</span>
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
        `Solo se pueden descargar documentos en estado "${Utils.Status.VIGENTE}". "${doc.documentName}" está en estado "${doc.status}".`
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
    DOM.detailType.textContent        = doc.type || '—';
    DOM.detailProcess.textContent     = doc.process || '—';
    DOM.detailStatus.textContent      = doc.status || '—';
    DOM.detailStatus.className        = `badge-estado ${Utils.Status.badgeClass(doc.status)}`;
    DOM.detailVersion.textContent     = doc.version || '—';
    DOM.detailIssueDate.textContent   = Utils.Format.dateLong(doc.issueDate) || '—';
    DOM.detailApprovalDate.textContent = Utils.Format.dateLong(doc.approvalDate) || '—';
    DOM.detailOwner.textContent       = doc.owner || '—';
    DOM.detailApplicable.textContent  = doc.applicableAreas || '—';
    DOM.detailRetention.textContent   = doc.retentionTime || '—';

    const canDownload = Utils.Status.isDownloadable(doc.status);
    DOM.btnDescargarPanel.disabled = !canDownload;
    DOM.btnDescargarPanel.setAttribute('aria-disabled', String(!canDownload));
    DOM.btnDescargarPanel.title = canDownload
      ? ''
      : `Solo se pueden descargar documentos en estado "${Utils.Status.VIGENTE}".`;

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
