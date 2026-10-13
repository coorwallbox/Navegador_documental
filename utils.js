/* ================================================================
   CONSULTA DOCUMENTAL
   utils.js · Fase 1 · 2026 (modelo de datos: Fase 6)
   Módulo de utilidades reutilizables.
   Expone el objeto global Utils con los siguientes submódulos:
     · Loader  — overlay de carga global
     · Toast   — sistema de notificaciones
     · Dialog  — panel lateral modal (detalle del documento)
     · Status  — los 4 estados de documento y la regla de descarga
     · Format  — presentación de fechas y retención
     · Json    — parseo y normalización de respuestas (20 columnas)
     · Data    — carga del listado (demo o flujo F1), compartida por las dos páginas
     · Table   — utilidades sobre el array de documentos
     · General — funciones auxiliares de propósito general
   Depende de: catalog.js (debe cargarse antes en el HTML)
================================================================ */

const Utils = (() => {

  'use strict';


  /* ==============================================================
     1. LOADER GLOBAL
     Controla el overlay de carga de pantalla completa.
  ============================================================== */
  const Loader = {

    _overlay: null,
    _text: null,

    /** Inicializa las referencias al DOM del loader. Llamar desde App.init(). */
    init() {
      Loader._overlay = document.getElementById('loader-global');
      Loader._text    = document.getElementById('loader-text');
    },

    /** Muestra el overlay de carga con un mensaje opcional. */
    show(message = 'Cargando...') {
      if (!Loader._overlay) return;
      if (Loader._text) Loader._text.textContent = message;
      Loader._overlay.classList.add('activo');
      Loader._overlay.setAttribute('aria-hidden', 'false');
    },

    /** Oculta el overlay de carga. */
    hide() {
      if (!Loader._overlay) return;
      Loader._overlay.classList.remove('activo');
      Loader._overlay.setAttribute('aria-hidden', 'true');
    },

  };


  /* ==============================================================
     2. TOASTS / NOTIFICACIONES
  ============================================================== */
  const Toast = {

    _container: null,

    /** Inicializa la referencia al contenedor de toasts. Llamar desde App.init(). */
    init() {
      Toast._container = document.getElementById('contenedor-mensajes');
    },

    success(text, duration = 4000)   { Toast._create('exito', 'Éxito', text, duration); },
    error(text, duration = 6000)     { Toast._create('error', 'Error', text, duration); },
    warning(text, duration = 5000)   { Toast._create('advertencia', 'Atención', text, duration); },
    info(text, duration = 4000)      { Toast._create('info', 'Información', text, duration); },

    /** @private */
    _create(type, title, text, duration) {
      if (!Toast._container) return;

      const icons = {
        exito:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
        error:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
        advertencia: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
        info:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      };

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
      toast.style.setProperty('--toast-duration', `${duration}ms`);

      toast.innerHTML = `
        <span class="toast__icono" aria-hidden="true">${icons[type]}</span>
        <div class="toast__cuerpo">
          <p class="toast__titulo">${title}</p>
          <p class="toast__texto">${text}</p>
        </div>
        <button class="toast__cerrar" type="button" aria-label="Cerrar notificación">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;

      toast.querySelector('.toast__cerrar').addEventListener('click', () => Toast._destroy(toast));
      Toast._container.appendChild(toast);

      const timerId = setTimeout(() => Toast._destroy(toast), duration);
      toast.addEventListener('mouseenter', () => clearTimeout(timerId));
      toast.addEventListener('mouseleave', () => setTimeout(() => Toast._destroy(toast), 1500));
    },

    /** @private */
    _destroy(toast) {
      if (!toast || !toast.parentNode) return;
      toast.classList.add('saliendo');
      toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, { once: true });
    },

  };


  /* ==============================================================
     2b. DIÁLOGOS (paneles laterales modales)
     Un solo diálogo activo a la vez: overlay
     compartido, fondo inerte, foco atrapado, Esc para cerrar y foco
     devuelto al elemento que lo abrió (Fase 9, generalizado en la 11).
  ============================================================== */
  const Dialog = {

    _active: null,
    _overlay: null,

    /** Inicializa el overlay compartido y el teclado. Llamar desde App.init(). */
    init() {
      Dialog._overlay = document.getElementById('detalle-overlay');
      Dialog._overlay.addEventListener('click', () => Dialog.close());
      document.addEventListener('keydown', (evento) => {
        if (!Dialog._active) return;
        if (evento.key === 'Escape') Dialog.close();
        else if (evento.key === 'Tab') Dialog._trapFocus(evento);
      });
    },

    /**
     * Abre un panel como diálogo modal.
     * @param {HTMLElement} panel
     * @param {Object} [options]
     * @param {HTMLElement} [options.initialFocus] — elemento que recibe el foco al abrir
     * @param {HTMLElement} [options.returnFocus] — elemento que recupera el foco al cerrar
     * @param {Function} [options.onClose] — se ejecuta al cerrar
     */
    open(panel, { initialFocus, returnFocus, onClose } = {}) {
      if (Dialog._active) Dialog.close();
      Dialog._active = { panel, returnFocus: returnFocus ?? document.activeElement, onClose };
      Dialog._overlay.classList.add('activo');
      Dialog._overlay.setAttribute('aria-hidden', 'false');
      panel.classList.add('activo');
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('sin-scroll');
      Dialog._setBackgroundInert(true);
      if (initialFocus) setTimeout(() => initialFocus.focus(), 50);
    },

    /** Cierra el diálogo activo y devuelve el foco. */
    close() {
      const active = Dialog._active;
      if (!active) return;
      Dialog._active = null;
      Dialog._overlay.classList.remove('activo');
      Dialog._overlay.setAttribute('aria-hidden', 'true');
      active.panel.classList.remove('activo');
      active.panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sin-scroll');
      Dialog._setBackgroundInert(false);
      if (active.onClose) active.onClose();
      if (active.returnFocus && typeof active.returnFocus.focus === 'function') active.returnFocus.focus();
    },

    /** Indica si ese panel es el diálogo abierto. */
    isOpen(panel) {
      return Boolean(Dialog._active) && Dialog._active.panel === panel;
    },

    /** Vuelve inerte el contenido detrás del diálogo; los avisos (toasts) quedan operables. @private */
    _setBackgroundInert(inert) {
      document.querySelectorAll('body > header, body > main, body > footer')
        .forEach((region) => { region.inert = inert; });
    },

    /** Tab en el último control vuelve al primero; Shift+Tab en el primero va al último. @private */
    _trapFocus(evento) {
      const panel = Dialog._active.panel;
      const focusables = [...panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]):not([type="radio"]), input[type="radio"]:checked:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const inside = panel.contains(document.activeElement);
      if (evento.shiftKey && (document.activeElement === first || !inside)) {
        evento.preventDefault();
        last.focus();
      } else if (!evento.shiftKey && (document.activeElement === last || !inside)) {
        evento.preventDefault();
        first.focus();
      }
    },

  };


  /* ==============================================================
     3. CONFIGURACIÓN DE ESTADOS DE DOCUMENTOS
     Única fuente de verdad para los estados válidos, su color de
     badge y la regla de qué estados permiten descarga.
  ============================================================== */
  const Status = {

    VIGENTE:     'VIGENTE',
    EN_REVISION: 'EN REVISIÓN',
    OBSOLETO:    'OBSOLETO',
    ELIMINADO:   'ELIMINADO',

    /** Los 4 estados de la propuesta (sección 3.6), en orden de uso. */
    ALL: ['VIGENTE', 'EN REVISIÓN', 'OBSOLETO', 'ELIMINADO'],

    /** Estados que habilitan abrir/descargar. EN REVISIÓN no (decisión 2026-10-13). */
    DOWNLOADABLE: ['VIGENTE'],

    /** Texto visible de cada estado (el dato se guarda en mayúsculas). */
    LABELS: {
      'VIGENTE':     'Vigente',
      'EN REVISIÓN': 'En revisión',
      'OBSOLETO':    'Obsoleto',
      'ELIMINADO':   'Eliminado',
    },

    /** Clase CSS del badge de cada estado. */
    BADGES: {
      'VIGENTE':     'badge-estado--vigente',
      'EN REVISIÓN': 'badge-estado--revision',
      'OBSOLETO':    'badge-estado--obsoleto',
      'ELIMINADO':   'badge-estado--eliminado',
    },

    /**
     * Lleva un estado escrito con otra capitalización o sin tilde
     * ("En revision") a su valor canónico. Si no lo reconoce, lo retorna limpio.
     * @param {string} status
     * @returns {string}
     */
    normalize(status) {
      const clean = String(status ?? '').trim();
      const key = General.normalizeText(clean);
      return Status.ALL.find((s) => General.normalizeText(s) === key) || clean;
    },

    /** Texto visible del estado. */
    label(status) {
      const canonical = Status.normalize(status);
      return Status.LABELS[canonical] || canonical;
    },

    /** Determina si un documento con este estado puede abrirse/descargarse. */
    isDownloadable(status) {
      return Status.DOWNLOADABLE.includes(Status.normalize(status));
    },

    /** Clase CSS del badge de estado (neutro si el estado no es válido). */
    badgeClass(status) {
      return Status.BADGES[Status.normalize(status)] || 'badge-estado--neutro';
    },

  };


  /* ==============================================================
     4. FORMATEO
     Presentación visual de datos (fechas, texto).
  ============================================================== */
  const Format = {

    /**
     * Formatea una fecha ISO ("YYYY-MM-DD") como fecha larga en español.
     * Ejemplo: "2025-02-10" → "10 de febrero de 2025"
     * Si la cadena no es una fecha válida, la retorna sin cambios.
     * @param {string} isoDate
     * @returns {string}
     */
    dateLong(isoDate) {
      if (!isoDate) return '';
      try {
        const date = new Date(`${isoDate}T00:00:00`);
        if (isNaN(date.getTime())) return isoDate;
        return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
        return isoDate;
      }
    },

    /** Fecha de hoy en ISO "YYYY-MM-DD" (hora local). */
    todayISO() {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /** Indica si una fecha ISO ya pasó (anterior a hoy). */
    isPast(isoDate) {
      return Boolean(isoDate) && /^\d{4}-\d{2}-\d{2}$/.test(isoDate) && isoDate < Format.todayISO();
    },

    /**
     * Texto de retención a partir de los años en archivo de gestión y central.
     * Ejemplo: ("2", "8") → "2 años en gestión + 8 en central"
     */
    retention(managementYears, centralYears) {
      const parts = [];
      if (managementYears) parts.push(`${managementYears} ${managementYears === '1' ? 'año' : 'años'} en gestión`);
      if (centralYears) parts.push(`${centralYears} en central`);
      return parts.join(' + ');
    },

  };


  /* ==============================================================
     5. PROCESAMIENTO JSON
     Normalización de la respuesta cruda (Excel de SharePoint /
     Power Automate) al modelo interno de documento.
  ============================================================== */
  const Json = {

    /** Parsea un string JSON de forma segura. Retorna null si falla. */
    parseSafe(text) {
      try {
        const clean = String(text).replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
      } catch {
        return null;
      }
    },

    /**
     * Columnas del listado maestro propuesto (20 columnas)
     * → propiedades internas del documento.
     */
    COLUMNS: {
      'CÓDIGO':                              'code',
      'NOMBRE DEL DOCUMENTO':                'documentName',
      'TIPO':                                'type',
      'PROCESO (SIGLA)':                     'process',
      'BANDA DEL MAPA':                      'band',
      'VERSIÓN':                             'version',
      'FECHA DE VIGENCIA':                   'effectiveDate',
      'ESTADO':                              'status',
      'FECHA LÍMITE DE REVISIÓN':            'reviewDeadline',
      'EMPRESA':                             'company',
      'DOCUMENTO PRINCIPAL':                 'parentCode',
      'UBICACIÓN':                           'location',
      'RETENCIÓN ARCHIVO DE GESTIÓN (AÑOS)': 'retentionManagementYears',
      'RETENCIÓN ARCHIVO CENTRAL (AÑOS)':    'retentionCentralYears',
      'DISPOSICIÓN FINAL':                   'finalDisposition',
      'FUNDAMENTO DE LA RETENCIÓN':          'retentionBasis',
      'CARGO QUE ELABORA':                   'preparedBy',
      'CARGO QUE APRUEBA':                   'approvedBy',
      'CONTROL DE CAMBIOS':                  'changeLog',
      'OBSERVACIONES':                       'notes',
    },

    /** Columnas con fecha (se llevan a ISO "YYYY-MM-DD"). */
    DATE_PROPERTIES: ['effectiveDate', 'reviewDeadline'],

    /**
     * Convierte una fecha del Excel a ISO "YYYY-MM-DD". Acepta ISO (con o sin
     * hora), "DD/MM/YYYY" y el número de serie de Excel (ej. 46000).
     * Si no la reconoce, la retorna sin cambios.
     * @param {string} value
     * @returns {string}
     */
    toISODate(value) {
      const text = String(value ?? '').trim();
      if (!text) return '';
      let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) return `${match[1]}-${match[2]}-${match[3]}`;
      match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      if (/^\d+(\.\d+)?$/.test(text)) {
        // Serie de Excel: días desde 1899-12-30
        const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(text)) * 86400000);
        return date.toISOString().slice(0, 10);
      }
      return text;
    },

    /**
     * Normaliza el array de documentos del listado maestro.
     * Los encabezados se comparan sin distinguir mayúsculas, tildes ni
     * espacios repetidos; también se aceptan los nombres de propiedad internos.
     * Reglas: ESTADO se lleva a su valor canónico; EMPRESA vacía = TODAS;
     * BANDA DEL MAPA vacía se deduce del catálogo según la sigla.
     *
     * @param {Array<Object>} raw — respuesta cruda
     * @returns {Array<Object>} documentos normalizados
     */
    normalizeDocuments(raw) {
      if (!Array.isArray(raw)) return [];

      const headerKey = (text) => General.normalizeText(text).replace(/\s+/g, ' ');
      const lookup = {};
      Object.entries(Json.COLUMNS).forEach(([header, prop]) => {
        lookup[headerKey(header)] = prop;
        lookup[headerKey(prop)] = prop;
      });

      return raw
        .map((item, index) => {
          const doc = { _id: `doc-${index}` };
          Object.values(Json.COLUMNS).forEach((prop) => { doc[prop] = ''; });

          Object.entries(item || {}).forEach(([key, value]) => {
            const prop = lookup[headerKey(key)];
            if (prop && value !== undefined && value !== null) doc[prop] = String(value).trim();
          });

          Json.DATE_PROPERTIES.forEach((prop) => { doc[prop] = Json.toISODate(doc[prop]); });
          doc.code       = doc.code.toUpperCase();
          doc.type       = doc.type.toUpperCase();
          doc.process    = doc.process.toUpperCase();
          doc.parentCode = doc.parentCode.toUpperCase();
          doc.status     = Status.normalize(doc.status);
          doc.company    = doc.company.toUpperCase() || Catalog.COMPANY_ALL;
          if (!doc.band) {
            const band = Catalog.bandOf(doc.process);
            doc.band = band ? band.code : '';
          }
          // Nivel de la pirámide documental: no es columna, se deduce del tipo
          const level = Catalog.levelOf(doc.type);
          doc.level = level ? level.code : '';
          // Clave del documento: código + empresa (las variantes comparten código)
          doc.key = `${doc.code}|${doc.company}`;
          return doc;
        })
        .filter((doc) => doc.code !== '' && doc.documentName !== '');
    },

  };


  /* ==============================================================
     5b. DATOS DEL LISTADO
     Carga compartida por la consulta y la página de cargue: modo demo
     (demo-data.js) si no hay URL de F1 en config.js; si la hay, llama
     al flujo F1 de Power Automate (contrato en docs/03_TRD.md).
  ============================================================== */
  const Data = {

    TIMEOUT_MS: 30000,

    /** true si no hay URL de F1 configurada (config.js del repositorio). */
    isDemo() {
      return !(typeof APP_CONFIG !== 'undefined' && APP_CONFIG.URL_DOCUMENTS);
    },

    /** Devuelve los documentos normalizados (lanza error si no se pueden cargar). */
    async loadDocuments() {
      let raw;
      if (Data.isDemo()) {
        await General.wait(600);
        if (typeof DEMO_DOCUMENTS === 'undefined') throw new Error('No se cargaron los datos demo (demo-data.js).');
        raw = DEMO_DOCUMENTS;
        General.log('Documentos demo cargados:', raw.length);
      } else {
        raw = await Data.callFlow(APP_CONFIG.URL_DOCUMENTS, {});
      }
      return Json.normalizeDocuments(raw);
    },

    /**
     * Llama a un flujo de Power Automate (POST JSON) y devuelve su respuesta.
     * Acepta { value: [...] } o { body: [...] } (Excel Online) además de un arreglo directo.
     */
    async callFlow(url, body = {}) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Data.TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = Json.parseSafe(await response.text());
      if (data === null) throw new Error('La respuesta de Power Automate no es un JSON válido.');
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.value)) return data.value;
        if (Array.isArray(data.body))  return data.body;
      }
      return data;
    },

  };


  /* ==============================================================
     6. UTILIDADES DE TABLA
     Operaciones sobre el array de documentos en memoria.
  ============================================================== */
  const Table = {

    /**
     * Filtra documentos cuyo nombre o código contenga el texto buscado.
     * Búsqueda insensible a mayúsculas y tildes.
     * @param {Array<Object>} documents
     * @param {string} keyword
     * @returns {Array<Object>}
     */
    filterByKeyword(documents, keyword) {
      if (!keyword || !keyword.trim()) return documents;

      const normalize = (str) =>
        String(str).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

      const term = normalize(keyword.trim());
      return documents.filter((doc) =>
        normalize(doc.documentName).includes(term) || normalize(doc.code).includes(term));
    },

    /**
     * Extrae la lista de procesos únicos presentes en los documentos,
     * ordenada alfabéticamente. Usada para poblar el filtro de proceso.
     * @param {Array<Object>} documents
     * @returns {Array<string>}
     */
    uniqueProcesses(documents) {
      const set = new Set(documents.map((doc) => doc.process).filter(Boolean));
      return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
    },

  };


  /* ==============================================================
     7. FUNCIONES AUXILIARES GENERALES
  ============================================================== */
  const General = {

    /** Retarda la ejecución hasta que `fn` deje de llamarse durante `wait` ms. */
    debounce(fn, wait = 300) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    /** Texto en mayúsculas, sin tildes y sin espacios en los extremos (para comparar). */
    normalizeText(text) {
      return String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
    },

    /** Forma corta para URL: minúsculas, sin tildes, espacios → guion ("EN REVISIÓN" → "en-revision"). */
    slug(text) {
      return General.normalizeText(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    },

    /** Escapa caracteres especiales de HTML para prevenir XSS en innerHTML. */
    escapeHTML(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, (c) => map[c]);
    },

    /** Retorna una promesa que se resuelve después de `ms` milisegundos. */
    wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    /**
     * Abre un archivo en una pestaña nueva. Se abre en vez de descargar porque
     * los enlaces de SharePoint son de otro dominio e ignoran el atributo `download`.
     * @param {string} url — ubicación del archivo (columna UBICACIÓN)
     */
    openURL(url) {
      window.open(url, '_blank', 'noopener');
    },

    /**
     * Extensión del archivo de una URL, en minúsculas ("" si no tiene).
     * Ej.: ".../COM-RG-087 Formato V2.xlsx?web=1" → "xlsx"
     */
    fileExtension(url) {
      // Se ignora un "#" inicial (ubicaciones demo "#demo/...") antes de quitar consulta y fragmento
      const path = String(url ?? '').replace(/^#/, '').split(/[?#]/)[0];
      const name = path.slice(path.lastIndexOf('/') + 1);
      const dot = name.lastIndexOf('.');
      return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
    },

    /**
     * Acción del botón según el archivo (decisión 2026-10-13):
     * PDF → 'open' (se consulta en el navegador); cualquier otra extensión →
     * 'download' (editables para diligenciar). Sin extensión (ej. enlace de
     * compartir de SharePoint) → 'open', que es lo seguro.
     */
    fileAction(url) {
      const extension = General.fileExtension(url);
      return extension && extension !== 'pdf' ? 'download' : 'open';
    },

    /**
     * Descarga un archivo. En SharePoint agrega ?download=1 (y quita ?web=1)
     * para que el servidor lo entregue como descarga en vez de abrirlo en Office web.
     * @param {string} url
     */
    downloadURL(url) {
      const target = new URL(url, window.location.href);
      if (/\.sharepoint\.com$/i.test(target.hostname)) {
        target.searchParams.delete('web');
        target.searchParams.set('download', '1');
      }
      const link = document.createElement('a');
      link.href = target.href;
      link.download = '';
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    /** Determina si la aplicación está en modo de desarrollo. */
    isDevMode() {
      return (
        location.hostname === 'localhost' ||
        location.hostname === '127.0.0.1' ||
        location.protocol === 'file:'
      );
    },

    /** Registra mensajes de depuración solo en modo desarrollo. */
    log(...args) {
      if (General.isDevMode()) console.log('[ConsultaDocumental]', ...args);
    },

    /** Registra errores siempre (desarrollo y producción). */
    logError(context, error) {
      console.error(`[ConsultaDocumental · ${context}]`, error);
    },

  };


  /* ==============================================================
     API PÚBLICA DEL MÓDULO
  ============================================================== */
  return { Loader, Toast, Dialog, Status, Format, Json, Data, Table, General };

})();
