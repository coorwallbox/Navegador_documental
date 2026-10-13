/* ================================================================
   CONSULTA DOCUMENTAL
   utils.js · Fase 1 · 2026 (modelo de datos: Fase 6)
   Módulo de utilidades reutilizables.
   Expone el objeto global Utils con los siguientes submódulos:
     · Loader  — overlay de carga global
     · Toast   — sistema de notificaciones
     · Status  — los 4 estados de documento y la regla de descarga
     · Format  — presentación de fechas y retención
     · Json    — parseo y normalización de respuestas (20 columnas)
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
     * Dispara la descarga de un archivo desde una URL en el navegador.
     * Crea un enlace temporal con el atributo `download` y simula el clic.
     * @param {string} url — ubicación del archivo (ej. enlace de SharePoint)
     * @param {string} filename — nombre sugerido para el archivo descargado
     */
    downloadFromURL(url, filename) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
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
  return { Loader, Toast, Status, Format, Json, Table, General };

})();
