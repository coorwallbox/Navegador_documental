/* ================================================================
   CONSULTA DOCUMENTAL
   utils.js · Fase 1 · 2026
   Módulo de utilidades reutilizables.
   Expone el objeto global Utils con los siguientes submódulos:
     · Loader  — overlay de carga global
     · Toast   — sistema de notificaciones
     · Json    — parseo y normalización de respuestas
     · Table   — utilidades sobre el array de documentos
     · General — funciones auxiliares de propósito general
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

    VIGENTE:         'Vigente',
    OBSOLETO:        'Obsoleto',
    EN_REVISION:     'En revisión',
    DESACTUALIZADO:  'Desactualizado',
    ANULADO:         'Anulado',

    /** Lista completa de estados disponibles, en el orden de uso esperado. */
    ALL: ['Vigente', 'Obsoleto', 'En revisión', 'Desactualizado', 'Anulado'],

    /** Estados que habilitan el botón de descarga. Solo "Vigente" por ahora. */
    DOWNLOADABLE: ['Vigente'],

    /**
     * Determina si un documento con este estado puede descargarse.
     * @param {string} status
     * @returns {boolean}
     */
    isDownloadable(status) {
      const normalized = String(status).trim().toLowerCase();
      return Status.DOWNLOADABLE.some((s) => s.toLowerCase() === normalized);
    },

    /**
     * Determina la clase CSS del badge de estado según su valor.
     * @param {string} status
     * @returns {string}
     */
    badgeClass(status) {
      const normalized = String(status).toLowerCase();
      if (normalized.includes('vigente'))        return 'badge-estado--vigente';
      if (normalized.includes('desactualizado')) return 'badge-estado--desactualizado';
      if (normalized.includes('obsoleto'))       return 'badge-estado--obsoleto';
      if (normalized.includes('anulado'))        return 'badge-estado--anulado';
      if (normalized.includes('revisión') || normalized.includes('revision')) return 'badge-estado--revision';
      return 'badge-estado--neutro';
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
     * Normaliza el array de documentos proveniente del Excel de SharePoint.
     * Mapea las columnas del Excel a las propiedades internas del modelo.
     *
     * Columnas del Excel → Propiedades internas:
     *   Código                       → code
     *   Nombre del documento         → documentName
     *   Tipo                         → type
     *   Proceso                      → process
     *   Versión                      → version
     *   Fecha de emisión             → issueDate
     *   Fecha de aprobación          → approvalDate
     *   Responsable                  → owner
     *   Estado                       → status
     *   Ubicación                    → location
     *   Usuarios o áreas aplicables  → applicableAreas
     *   Tiempo de retención          → retentionTime
     *
     * @param {Array<Object>} raw — respuesta cruda
     * @returns {Array<Object>} documentos normalizados
     */
    normalizeDocuments(raw) {
      if (!Array.isArray(raw)) return [];

      const field = (item, ...keys) => {
        for (const key of keys) {
          if (item[key] !== undefined && item[key] !== null) return String(item[key]).trim();
        }
        return '';
      };

      return raw
        .map((item, index) => ({
          _id:              `doc-${index}`,
          code:             field(item, 'Código', 'Codigo', 'code'),
          documentName:     field(item, 'Nombre del documento', 'documentName'),
          type:             field(item, 'Tipo', 'type'),
          process:          field(item, 'Proceso', 'process'),
          version:          field(item, 'Versión', 'Version', 'version'),
          issueDate:        field(item, 'Fecha de emisión', 'issueDate'),
          approvalDate:     field(item, 'Fecha de aprobación', 'approvalDate'),
          owner:            field(item, 'Responsable', 'owner'),
          status:           field(item, 'Estado', 'status'),
          location:         field(item, 'Ubicación', 'Ubicacion', 'location'),
          applicableAreas:  field(item, 'Usuarios o áreas aplicables', 'applicableAreas'),
          retentionTime:    field(item, 'Tiempo de retención', 'retentionTime'),
        }))
        .filter((doc) => doc.code !== '' && doc.documentName !== '');
    },

  };


  /* ==============================================================
     6. UTILIDADES DE TABLA
     Operaciones sobre el array de documentos en memoria.
  ============================================================== */
  const Table = {

    /**
     * Filtra documentos cuyo nombre contenga el texto buscado.
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
      return documents.filter((doc) => normalize(doc.documentName).includes(term));
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
