/* ================================================================
   CONSULTA DOCUMENTAL
   upload.js · Fase 11 · 2026 (cumplimiento: Fase 13)
   Página independiente de cargue de documentos (cargue.html; objeto
   global Upload). La consulta no la enlaza (ajuste 2026-10-13).
   Un líder de proceso envía una solicitud; Sistemas de Gestión la
   aprueba y el flujo F3 publica (ver docs/03_TRD.md, contrato F2).
   Casos: documento nuevo, nueva versión, anexo, variante por empresa y
   retiro (sin archivo; al aprobarse queda ELIMINADO).
   Sin URL_UPLOAD configurada, el envío se simula (modo demo).
   Fase 13: el solicitante inicia sesión con la cuenta de la empresa
   (auth.js) y el token va a F2; aviso de privacidad; correo de quien
   aprueba el contenido; clasificación y, en externos, emisor.
   Depende de: config.js, config-cargue.js, catalog.js, utils.js,
   demo-data.js (lista de documentos en modo demo) y auth.js.
================================================================ */

const Upload = (() => {

  'use strict';

  /* ============================================================
     CONFIGURACIÓN
  ============================================================ */
  // Configuración propia del cargue (config-cargue.js; solo la carga cargue.html)
  const DEPLOY = (typeof UPLOAD_CONFIG !== 'undefined') ? UPLOAD_CONFIG : {};

  const CONFIG = {
    URL_UPLOAD:      DEPLOY.URL_UPLOAD || '',
    REVIEW_DAYS:     DEPLOY.REVIEW_DAYS || 15,
    MAX_UPLOAD_MB:   DEPLOY.MAX_UPLOAD_MB || 20,
    // Dominios de correo aceptados (vacío = sin restricción en el navegador; F2 valida igual)
    EMAIL_DOMAINS:   DEPLOY.ALLOWED_EMAIL_DOMAINS || [],
    TIMEOUT_MS:      60000,
    // Formatos que se pueden cargar (F2 los vuelve a validar)
    EXTENSIONS:      ['pdf', 'docx', 'xlsx', 'pptx'],
  };

  /** Tipos de solicitud (valor de requestType en el contrato F2). */
  const TYPES = {
    NEW:         'NEW',
    NEW_VERSION: 'NEW_VERSION',
    ANNEX:       'ANNEX',
    VARIANT:     'VARIANT',
    RETIRE:      'RETIRE',
  };

  /** Estados desde los que no se puede pedir un cargue sobre un documento existente. */
  const CLOSED_STATUSES = ['OBSOLETO', 'ELIMINADO'];

  const DOM = {};
  const state = {
    getDocuments: () => [],
    optionMap: new Map(),   // texto de la opción del buscador → documento
    selected: null,         // documento existente elegido
    demoCounter: 0,
    sending: false,
    user: null,             // solicitante con sesión ({ name, email }) o null
  };


  /* ============================================================
     1. INICIALIZACIÓN
  ============================================================ */

  /** Punto de entrada de la página: carga el listado y deja el formulario listo. */
  async function start() {
    Utils.Loader.init();
    Utils.Toast.init();
    Utils.DemoNotice.init(Utils.Data.isDemo() || !CONFIG.URL_UPLOAD);  // listado o envío simulados
    let documents = [];
    Utils.Loader.show('Cargando el listado de documentos...');
    try {
      documents = await Utils.Data.loadDocuments();
    } catch (error) {
      Utils.General.logError('Upload.start', error);
      Utils.Toast.error('No se pudo cargar el listado: solo podrás solicitar documentos nuevos. Intenta más tarde para los demás casos.');
    } finally {
      Utils.Loader.hide();
    }
    // Sesión que ya exista en la pestaña (en modo demo se inicia con el botón)
    try {
      state.user = await Auth.init();
    } catch (error) {
      Utils.General.logError('Upload.start · Auth', error);
      Utils.Toast.error('No se pudo preparar el inicio de sesión. Recarga la página; si persiste, avisa a Sistemas de Gestión.');
    }
    init({ getDocuments: () => documents });
  }

  /**
   * @param {Object} options
   * @param {Function} options.getDocuments — devuelve los documentos del listado
   */
  function init({ getDocuments }) {
    state.getDocuments = getDocuments;
    _cacheDOM();
    _populateStaticOptions();
    _bindEvents();
    _reset();
  }

  function _cacheDOM() {
    const $ = (id) => document.getElementById(id);
    Object.assign(DOM, {
      btnClear:       $('btn-cancelar-cargue'),
      btnSubmit:      $('btn-enviar-cargue'),
      btnAnother:     $('btn-otro-cargue'),
      form:           $('form-cargue'),
      stepper:        $('cargue-pasos'),
      steps:          Array.from(document.querySelectorAll('#cargue-pasos > ds-step')),
      stepChange:     $('cargue-paso-cambio'),
      stepFile:       $('cargue-paso-archivo'),
      noteRetire:     $('cargue-nota-retiro'),
      result:         $('cargue-resultado'),
      resultText:     $('cargue-resultado-texto'),
      resultSummary:  $('cargue-resultado-resumen'),
      sectionExisting:$('cargue-seccion-existente'),
      sectionDocument:$('cargue-seccion-documento'),
      sectionFile:    $('cargue-seccion-archivo'),
      rowRoles:       $('cargue-fila-cargos'),
      legendChange:   $('cargue-leyenda-cambio'),
      legendExisting: $('cargue-leyenda-existente'),
      inputDocument:  $('cargue-documento'),
      listDocuments:  $('cargue-documentos-lista'),
      summary:        $('cargue-resumen'),
      noteExisting:   $('cargue-aviso-existente'),
      process:        $('cargue-proceso'),
      type:           $('cargue-tipo'),
      name:           $('cargue-nombre'),
      company:        $('cargue-empresa'),
      codePreview:    $('cargue-codigo-previo'),
      sectionRetention: $('cargue-seccion-retencion'),
      retManagement:  $('cargue-ret-gestion'),
      retCentral:     $('cargue-ret-central'),
      disposition:    $('cargue-disposicion'),
      basis:          $('cargue-fundamento'),
      labelDescription: $('cargue-descripcion-etiqueta'),
      description:    $('cargue-descripcion'),
      preparedBy:     $('cargue-elabora'),
      approvedBy:     $('cargue-aprueba'),
      notes:          $('cargue-observaciones'),
      classification: $('cargue-clasificacion'),
      issuerField:    $('cargue-campo-emisor'),
      issuer:         $('cargue-emisor'),
      approverField:  $('cargue-campo-aprobador'),
      approver:       $('cargue-aprobador'),
      sessionOut:     $('cargue-sesion-fuera'),
      sessionIn:      $('cargue-sesion-dentro'),
      btnSignIn:      $('cargue-sesion'),
      btnSignOut:     $('cargue-cerrar-sesion'),
      userName:       $('cargue-usuario-nombre'),
      userEmail:      $('cargue-usuario-correo'),
      privacy:        $('cargue-privacidad'),
      file:           $('cargue-archivo'),
      fileHelp:       $('cargue-archivo-ayuda'),
    });
  }

  /** Opciones que no dependen del documento: procesos, tipos, disposición. @private */
  function _populateStaticOptions() {
    const option = (value, text) => {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      return o;
    };

    DOM.process.appendChild(option('', 'Elige un proceso'));
    Catalog.BANDS.forEach((band) => band.groups.forEach((group) => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.name ? `${band.name} · ${group.name}` : band.name;
      group.processes.forEach((code) => optgroup.appendChild(option(code, `${code} — ${Catalog.processName(code)}`)));
      DOM.process.appendChild(optgroup);
    }));

    DOM.type.appendChild(option('', 'Elige un tipo'));
    Catalog.TYPES.forEach((t) => DOM.type.appendChild(option(t.code, `${t.code} — ${t.name}`)));

    DOM.disposition.appendChild(option('', 'Elige una opción'));
    Catalog.DISPOSITIONS.forEach((d) => DOM.disposition.appendChild(option(d, d.charAt(0) + d.slice(1).toLowerCase())));

    DOM.file.accept = CONFIG.EXTENSIONS.map((e) => `.${e}`).join(',');
    DOM.fileHelp.textContent = `PDF, Word, Excel o PowerPoint · máximo ${CONFIG.MAX_UPLOAD_MB} MB.`;
  }

  function _bindEvents() {
    DOM.btnClear.addEventListener('click', () => _reset(TYPES.NEW, true));
    DOM.btnAnother.addEventListener('click', () => _reset(TYPES.NEW, true));
    DOM.btnSignIn.addEventListener('click', _handleSignIn);
    DOM.btnSignOut.addEventListener('click', _handleSignOut);
    DOM.form.addEventListener('submit', _handleSubmit);
    // Stepper: se avanza solo si los campos del paso actual son válidos
    DOM.stepper.addEventListener('stepper-before-next', (evento) => {
      if (!_validate(DOM.steps[evento.detail.index])) evento.preventDefault();
    });
    DOM.form.querySelectorAll('[data-step-next]').forEach((btn) => btn.addEventListener('click', _nextStep));
    // El stepper no avisa los cambios de paso: se observa el atributo state de cada paso
    new MutationObserver(_syncStepActions).observe(DOM.stepper, { subtree: true, attributes: true, attributeFilter: ['state'] });
    DOM.form.querySelectorAll('input[name="requestType"]').forEach((radio) =>
      radio.addEventListener('change', _applyRequestType));
    DOM.inputDocument.addEventListener('input', _handleDocumentInput);
    DOM.inputDocument.addEventListener('change', _handleDocumentInput);
    [DOM.process, DOM.type, DOM.company].forEach((el) => el.addEventListener('change', _updateDerived));
    // Al corregir un campo se limpia su error
    DOM.form.addEventListener('input', (evento) => _clearError(evento.target));
    DOM.form.addEventListener('change', (evento) => _clearError(evento.target));
  }


  /* ============================================================
     2. APERTURA Y ESTADO DEL FORMULARIO
  ============================================================ */

  /**
   * Deja el formulario vacío, en la vista de formulario.
   * @param {string} [requestType]
   * @param {boolean} [focus] — true si lo pidió el usuario (Limpiar / Cargar otro)
   * @private
   */
  function _reset(requestType = TYPES.NEW, focus = false) {
    DOM.form.reset();
    DOM.form.hidden = false;
    DOM.result.hidden = true;
    DOM.btnSubmit.hidden = false;
    DOM.btnClear.hidden = false;
    DOM.btnAnother.hidden = true;
    DOM.form.querySelector(`input[name="requestType"][value="${requestType}"]`).checked = true;
    _applyRequestType();
    DOM.stepper.reset();
    _renderSession();  // la sesión se conserva entre solicitudes
    _syncStepActions();
    if (focus) DOM.form.querySelector('input[name="requestType"]:checked').focus();
  }

  /* ------------------------------------------------------------
     Sesión del solicitante (auth.js)
  ------------------------------------------------------------ */

  /** Muestra el botón de inicio de sesión o el solicitante con sesión. @private */
  function _renderSession() {
    const user = state.user;
    DOM.sessionOut.hidden = Boolean(user);
    DOM.sessionIn.hidden = !user;
    DOM.userName.textContent = user ? user.name : '';
    DOM.userEmail.textContent = user ? user.email : '';
  }

  /** «Iniciar sesión»: ventana de Microsoft (o usuario simulado en modo demo). @private */
  async function _handleSignIn() {
    DOM.btnSignIn.disabled = true;
    DOM.btnSignIn.textContent = 'Abriendo inicio de sesión…';
    try {
      state.user = await Auth.signIn();
      _clearError(DOM.btnSignIn);
      _renderSession();
      DOM.privacy.focus();
    } catch (error) {
      Utils.General.logError('Upload._handleSignIn', error);
      if (error && error.errorCode === 'user_cancelled') Utils.Toast.info('Se canceló el inicio de sesión.');
      else Utils.Toast.error('No se pudo iniciar sesión. Si la ventana no abre, permite las ventanas emergentes de esta página.');
    } finally {
      DOM.btnSignIn.disabled = false;
      DOM.btnSignIn.textContent = 'Iniciar sesión';
    }
  }

  /** «Usar otra cuenta»: cierra la sesión y vuelve al botón. @private */
  async function _handleSignOut() {
    try {
      await Auth.signOut();
    } catch (error) {
      Utils.General.logError('Upload._handleSignOut', error);
    }
    state.user = null;
    _clearError(DOM.btnSignOut);
    _renderSession();
    DOM.btnSignIn.focus();
  }

  function _isLastStep() {
    return DOM.stepper.currentIndex === DOM.steps.length - 1;
  }

  /**
   * «Siguiente»: valida el paso actual (también si el siguiente ya se visitó, caso en que el stepper no valida),
   * avanza y lleva el foco al primer campo del paso nuevo.
   * @private
   */
  function _nextStep() {
    const before = DOM.stepper.currentIndex;
    if (!_validate(DOM.steps[before])) return;
    DOM.stepper.next();
    if (DOM.stepper.currentIndex !== before) _focusStep(DOM.steps[DOM.stepper.currentIndex]);
  }

  /** Foco en el primer campo visible y habilitado del paso (en radios, el marcado). @private */
  function _focusStep(step) {
    const fields = step.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    const visible = Array.from(fields).filter((el) => !el.closest('[hidden]') && (el.type !== 'radio' || el.checked));
    if (visible.length) visible[0].focus();
    else step.querySelector('[data-step-next]')?.focus();
  }

  /** «Enviar solicitud» solo aparece en el último paso. @private */
  function _syncStepActions() {
    if (!DOM.result.hidden) return;  // vista de resultado: la maneja _showResult
    DOM.btnSubmit.hidden = !_isLastStep();
  }

  function _requestType() {
    return DOM.form.querySelector('input[name="requestType"]:checked').value;
  }

  /** Muestra, oculta y habilita campos según el tipo de solicitud. @private */
  function _applyRequestType() {
    const type = _requestType();
    const isNew = type === TYPES.NEW;

    _clearAllErrors();  // cambia el contexto: los errores anteriores ya no aplican
    state.selected = null;
    DOM.inputDocument.value = '';
    DOM.summary.hidden = true;
    DOM.noteExisting.hidden = true;
    DOM.sectionExisting.hidden = isNew;
    const isRetire = type === TYPES.RETIRE;
    DOM.legendExisting.textContent = {
      NEW_VERSION: 'Documento a actualizar',
      ANNEX:       'Documento principal',
      VARIANT:     'Documento base de la variante',
      RETIRE:      'Documento a retirar',
    }[type] || '';
    DOM.labelDescription.textContent = isNew ? 'Motivo de creación' : isRetire ? 'Motivo del retiro' : 'Descripción del cambio';
    DOM.legendChange.textContent = isRetire ? 'Motivo' : 'Cambio y responsables';
    DOM.stepChange.setAttribute('label', DOM.legendChange.textContent);
    DOM.stepFile.setAttribute('label', isRetire ? 'Confirmación' : 'Archivo');
    DOM.noteRetire.hidden = !isRetire;

    // Retiro: sin datos del documento, cargos, aprobador ni archivo (solo el documento elegido y el motivo);
    // los cargos dependen también del tipo (externo): _updateDerived
    DOM.sectionDocument.hidden = isRetire;
    DOM.sectionFile.hidden = isRetire;
    DOM.approverField.hidden = isRetire;
    [DOM.approver, DOM.classification, DOM.file].forEach((el) => { el.disabled = isRetire; });

    // Proceso y tipo solo se eligen en un documento nuevo; en los demás vienen del existente
    DOM.process.disabled = !isNew;
    DOM.type.disabled = !isNew;
    // Nombre: editable salvo en variante (es el mismo documento) y retiro
    DOM.name.disabled = type === TYPES.VARIANT || isRetire;
    // Empresa: se elige en nuevo y variante; en los demás es la del existente
    DOM.company.disabled = !(isNew || type === TYPES.VARIANT);
    DOM.name.placeholder = type === TYPES.ANNEX ? 'Ej. Anexo 2. Matriz de responsables' : '';

    if (isNew) {
      DOM.process.value = '';
      DOM.type.value = '';
      DOM.name.value = '';
    }
    _fillCompanyOptions(isNew ? Catalog.COMPANIES : []);
    _fillDocumentOptions(type);
    _updateDerived();
  }

  /** Opciones de empresa (en variante: solo las que aún no tiene el documento). @private */
  function _fillCompanyOptions(companies, selectedValue = '') {
    DOM.company.innerHTML = '';
    companies.forEach((c) => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = Catalog.companyLabel(c);
      DOM.company.appendChild(o);
    });
    if (selectedValue) DOM.company.value = selectedValue;
  }

  /** Opciones del buscador de documentos existentes según el tipo de solicitud. @private */
  function _fillDocumentOptions(type) {
    state.optionMap.clear();
    DOM.listDocuments.innerHTML = '';
    if (type === TYPES.NEW) return;

    state.getDocuments()
      .filter((doc) => !CLOSED_STATUSES.includes(doc.status))
      .filter((doc) => type !== TYPES.ANNEX || !doc.parentCode)   // un anexo no tiene anexos
      .forEach((doc) => {
        // En anexo basta el código del principal; en los demás importa la empresa (variante)
        const text = type === TYPES.ANNEX
          ? `${doc.code} · ${doc.documentName}`
          : `${doc.code} · ${doc.documentName} · ${Catalog.companyLabel(doc.company)}`;
        if (state.optionMap.has(text)) return;
        state.optionMap.set(text, doc);
        const o = document.createElement('option');
        o.value = text;
        DOM.listDocuments.appendChild(o);
      });
  }

  /** Al escribir o elegir en el buscador: si coincide con una opción, se toma ese documento. @private */
  function _handleDocumentInput() {
    const doc = state.optionMap.get(DOM.inputDocument.value.trim()) || null;
    if (doc === state.selected) return;
    state.selected = doc;
    _applySelectedDocument();
  }

  /** Precarga los datos del documento existente elegido. @private */
  function _applySelectedDocument() {
    const doc = state.selected;
    const type = _requestType();
    DOM.noteExisting.hidden = true;
    // Los campos se precargan: se limpian sus errores (el del buscador se conserva si no hay documento)
    DOM.form.querySelectorAll('[aria-invalid]').forEach((el) => { if (el !== DOM.inputDocument || doc) _clearError(el); });

    if (!doc) {
      DOM.summary.hidden = true;
      DOM.process.value = '';
      DOM.type.value = '';
      DOM.name.value = '';
      DOM.classification.value = Catalog.CLASSIFICATION_INTERNAL;
      DOM.issuer.value = '';
      _fillCompanyOptions([]);
      _updateDerived();
      return;
    }

    const escape = Utils.General.escapeHTML;
    DOM.summary.innerHTML = `
      <p class="cargue-resumen__titulo">${escape(doc.code)} · ${escape(doc.documentName)}</p>
      <p class="cargue-resumen__meta">${escape(Catalog.typeName(doc.type))} · ${escape(doc.process)} — ${escape(Catalog.processName(doc.process))}
        · Versión ${escape(doc.version || '—')} · ${escape(Catalog.companyLabel(doc.company))}
        · <span class="badge-estado ${Utils.Status.badgeClass(doc.status)}">${escape(Utils.Status.label(doc.status))}</span></p>`;
    DOM.summary.hidden = false;

    DOM.process.value = doc.process;
    DOM.type.value = doc.type;
    DOM.name.value = type === TYPES.ANNEX ? '' : doc.documentName;
    DOM.preparedBy.value = doc.preparedBy;
    DOM.approvedBy.value = doc.approvedBy;
    DOM.retManagement.value = doc.retentionManagementYears;
    DOM.retCentral.value = doc.retentionCentralYears;
    DOM.disposition.value = doc.finalDisposition;
    DOM.basis.value = doc.retentionBasis;
    DOM.classification.value = doc.classification || Catalog.CLASSIFICATION_INTERNAL;
    DOM.issuer.value = doc.issuer || '';

    let note = '';
    if (type === TYPES.VARIANT) {
      const taken = state.getDocuments().filter((d) => d.code === doc.code).map((d) => d.company);
      const free = Catalog.COMPANIES.filter((c) => c !== Catalog.COMPANY_ALL && !taken.includes(c));
      _fillCompanyOptions(free);
      if (!free.length) note = 'Este documento ya existe para todas las empresas: no admite otra variante.';
      else if (taken.includes(Catalog.COMPANY_ALL)) {
        note = 'Hoy el documento aplica a todas las empresas; al aprobar la variante, SG ajustará su registro.';
      }
    } else {
      _fillCompanyOptions([doc.company], doc.company);
    }
    if (type === TYPES.NEW_VERSION && doc.status === Utils.Status.EN_REVISION) {
      note = 'Este documento ya está En revisión: confirma con Sistemas de Gestión que no haya otra solicitud en curso.';
    }
    if (type === TYPES.NEW_VERSION || type === TYPES.RETIRE) {
      const variants = state.getDocuments().filter((d) => d.code === doc.code && d.company !== doc.company);
      if (variants.length) {
        note = `${note ? `${note} ` : ''}Este código tiene variantes (${variants.map((d) => Catalog.companyLabel(d.company)).join(', ')}): `
          + 'esta solicitud aplica solo a la empresa elegida; cada variante va en su propia solicitud.';
      }
    }
    if (type === TYPES.RETIRE) {
      const annexes = state.getDocuments().filter((d) => d.parentCode === doc.code && !CLOSED_STATUSES.includes(d.status));
      if (annexes.length) {
        note = `${note ? `${note} ` : ''}Tiene ${annexes.length === 1 ? 'un anexo vigente' : `${annexes.length} anexos vigentes`} `
          + `(${[...new Set(annexes.map((d) => d.code))].join(', ')}): Sistemas de Gestión decidirá si también se retiran.`;
      }
    }
    DOM.noteExisting.textContent = note;
    DOM.noteExisting.hidden = !note;
    _updateDerived();
  }

  /** Recalcula la retención, el emisor y los cargos visibles, y la vista previa del código. @private */
  function _updateDerived() {
    const type = _requestType();
    const isRetire = type === TYPES.RETIRE;
    const isRG = DOM.type.value === 'RG' && !isRetire;
    DOM.sectionRetention.hidden = !isRG;
    [DOM.retManagement, DOM.retCentral, DOM.disposition, DOM.basis].forEach((el) => { el.disabled = !isRG; });
    // Externo (DE): pide el emisor; no tiene cargo que elabora ni que aprueba (los fija su emisor)
    const isExternal = Catalog.isExternal(DOM.type.value) && !isRetire;
    DOM.issuerField.hidden = !isExternal;
    DOM.issuer.disabled = !isExternal;
    const withRoles = !isRetire && !isExternal;
    DOM.rowRoles.hidden = !withRoles;
    [DOM.preparedBy, DOM.approvedBy].forEach((el) => { el.disabled = !withRoles; });
    DOM.codePreview.textContent = _codePreviewText(type);
  }

  /** Texto de la vista previa del código (provisional: lo confirma SG al aprobar). @private */
  function _codePreviewText(type) {
    const doc = state.selected;
    const docs = state.getDocuments();
    if (type === TYPES.NEW) {
      if (!DOM.process.value || !DOM.type.value) return 'Código: se calcula al elegir proceso y tipo.';
      return `Código provisional: ${proposedCode(docs, TYPES.NEW, { process: DOM.process.value, type: DOM.type.value })} (lo confirma SG al aprobar).`;
    }
    if (!doc) return '';
    if (type === TYPES.RETIRE) {
      return `Al aprobarse, ${doc.code} (${Catalog.companyLabel(doc.company)}) queda Eliminado: su archivo pasa a _Obsoletos y el código no se reutiliza.`;
    }
    if (type === TYPES.ANNEX) {
      return `Código provisional: ${proposedCode(docs, TYPES.ANNEX, { parentCode: doc.code })}, versión 1 (lo confirma SG al aprobar).`;
    }
    if (type === TYPES.NEW_VERSION) {
      const next = (parseInt(doc.version, 10) || 0) + 1;
      const deadline = Utils.Format.dateLong(_addDays(Utils.Format.todayISO(), CONFIG.REVIEW_DAYS));
      return `Mismo código ${doc.code}, versión propuesta ${next}. Al enviar, el documento queda En revisión hasta la decisión de SG (fecha límite: ${deadline}).`;
    }
    return `Mismo código ${doc.code}, para la empresa elegida.`;
  }


  /* ============================================================
     3. REGLAS DE CÓDIGO (vista previa; F3 aplica las mismas al aprobar)
  ============================================================ */

  /**
   * Código propuesto según la regla de codificación:
   * NEW → siguiente consecutivo libre de SIGLA-TIPO (nunca reutiliza: cuenta todos los estados);
   * ANNEX → código del principal + siguiente -ANnn.
   * @param {Array<Object>} documents
   * @param {string} requestType
   * @param {Object} data — { process, type } o { parentCode }
   * @returns {string}
   */
  function proposedCode(documents, requestType, data) {
    if (requestType === TYPES.ANNEX) {
      const prefix = `${data.parentCode}-AN`;
      const used = documents.map((d) => d.code).filter((c) => c.startsWith(prefix))
        .map((c) => parseInt(c.slice(prefix.length), 10)).filter((n) => !isNaN(n));
      return `${prefix}${String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0')}`;
    }
    const pattern = new RegExp(`^${data.process}-${data.type}-(\\d{3})$`);
    const used = documents.map((d) => (d.code.match(pattern) || [])[1]).filter(Boolean).map(Number);
    return `${data.process}-${data.type}-${String((used.length ? Math.max(...used) : 0) + 1).padStart(3, '0')}`;
  }

  function _addDays(isoDate, days) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }


  /* ============================================================
     4. VALIDACIÓN
  ============================================================ */

  /**
   * Valida el formulario; marca los errores y devuelve true si es válido.
   * @param {Element} [scope] — un paso del stepper: solo se validan sus campos (al pulsar «Siguiente»)
   * @private
   */
  function _validate(scope) {
    const type = _requestType();
    const errors = [];
    const required = (el, message) => { if (!el.disabled && !String(el.value).trim()) errors.push([el, message]); };

    if (type !== TYPES.NEW && !state.selected) {
      errors.push([DOM.inputDocument, 'Elige un documento de la lista (busca por código o nombre).']);
    }
    required(DOM.process, 'Elige el proceso.');
    required(DOM.type, 'Elige el tipo de documento.');
    required(DOM.name, type === TYPES.ANNEX ? 'Escribe el nombre del anexo.' : 'Escribe el nombre del documento.');
    required(DOM.issuer, 'Escribe quién emite el documento externo.');
    if (type === TYPES.VARIANT && state.selected && !DOM.company.value) {
      errors.push([DOM.company, 'No hay empresas disponibles para una variante de este documento.']);
    }
    if (DOM.type.value === 'RG' && type !== TYPES.RETIRE) {
      ['retManagement', 'retCentral'].forEach((key) => {
        const value = DOM[key].value.trim();
        if (!/^\d{1,3}$/.test(value) || Number(value) > 100) errors.push([DOM[key], 'Escribe un número entero de años (0 a 100).']);
      });
      required(DOM.disposition, 'Elige la disposición final.');
    }
    required(DOM.description, type === TYPES.NEW ? 'Explica el motivo de creación.'
      : type === TYPES.RETIRE ? 'Explica el motivo del retiro.' : 'Describe el cambio.');
    required(DOM.preparedBy, 'Escribe el cargo que elabora.');
    required(DOM.approvedBy, 'Escribe el cargo que aprueba.');
    if (!DOM.approver.disabled) {
      const problem = _emailProblem(DOM.approver.value, 'el correo de quien aprueba el contenido');
      if (problem) errors.push([DOM.approver, problem]);
    }

    // Solicitante: sale de la cuenta de la empresa (no se escribe)
    if (!state.user) {
      errors.push([DOM.btnSignIn, 'Inicia sesión con tu cuenta de la empresa.']);
    } else if (_emailProblem(state.user.email, 'tu correo')) {
      // Con sesión el botón de inicio está oculto: el error va junto a «Usar otra cuenta»
      errors.push([DOM.btnSignOut, `La cuenta ${state.user.email} no es de la empresa: usa otra cuenta.`]);
    }
    if (!DOM.privacy.checked) errors.push([DOM.privacy, 'Confirma que leíste el aviso de privacidad.']);

    const file = DOM.file.files[0];
    if (DOM.file.disabled) {
      // Retiro: no lleva archivo
    } else if (!file) {
      errors.push([DOM.file, 'Adjunta el archivo.']);
    } else {
      const extension = Utils.General.fileExtension(file.name);
      if (!CONFIG.EXTENSIONS.includes(extension)) {
        errors.push([DOM.file, `Formato no permitido (.${extension || '?'}). Usa PDF, Word, Excel o PowerPoint.`]);
      } else if (file.size > CONFIG.MAX_UPLOAD_MB * 1024 * 1024) {
        errors.push([DOM.file, `El archivo pesa ${(file.size / 1048576).toFixed(1)} MB; el máximo es ${CONFIG.MAX_UPLOAD_MB} MB.`]);
      } else if (file.size === 0) {
        errors.push([DOM.file, 'El archivo está vacío.']);
      }
    }

    const shown = scope ? errors.filter(([el]) => scope.contains(el)) : errors;
    shown.forEach(([el, message]) => _showError(el, message));
    if (shown.length) {
      // Al enviar, el primer error puede estar en un paso anterior (ya visitado): se vuelve a ese paso
      const stepIndex = DOM.steps.findIndex((step) => step.contains(shown[0][0]));
      if (stepIndex !== -1 && stepIndex !== DOM.stepper.currentIndex) DOM.stepper.goTo(stepIndex);
      shown[0][0].focus();
      const fields = shown.length === 1 ? 'el campo marcado' : `los ${shown.length} campos marcados`;
      Utils.Toast.warning(`Revisa ${fields} antes de ${scope ? 'continuar' : 'enviar'}.`);
    }
    return shown.length === 0;
  }

  /** Mensaje si un correo no es válido o no es de un dominio permitido ('' si está bien). @private */
  function _emailProblem(value, what) {
    const email = String(value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return `Escribe ${what} con un formato válido.`;
    const domain = (email.split('@')[1] || '').toLowerCase();
    if (CONFIG.EMAIL_DOMAINS.length && !CONFIG.EMAIL_DOMAINS.includes(domain)) {
      return `Usa un correo de la empresa (${CONFIG.EMAIL_DOMAINS.join(', ')}).`;
    }
    return '';
  }

  function _showError(el, message) {
    const box = document.getElementById(`${el.id}-error`);
    el.setAttribute('aria-invalid', 'true');
    if (box) {
      box.textContent = message;
      box.hidden = false;
      const described = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (!described.includes(box.id)) el.setAttribute('aria-describedby', [...described, box.id].join(' '));
    }
  }

  function _clearAllErrors() {
    DOM.form.querySelectorAll('[aria-invalid]').forEach(_clearError);
  }

  function _clearError(el) {
    if (!el || !el.id || !el.hasAttribute('aria-invalid')) return;
    el.removeAttribute('aria-invalid');
    const box = document.getElementById(`${el.id}-error`);
    if (box) {
      box.hidden = true;
      box.textContent = '';
    }
  }


  /* ============================================================
     5. ENVÍO (contrato F2: docs/03_TRD.md)
  ============================================================ */

  async function _handleSubmit(evento) {
    evento.preventDefault();
    // Enter en un campo antes del último paso: avanza en vez de enviar
    if (!_isLastStep()) {
      _nextStep();
      return;
    }
    if (state.sending || !_validate()) return;

    state.sending = true;
    DOM.btnSubmit.disabled = true;
    DOM.btnSubmit.setAttribute('aria-busy', 'true');
    DOM.btnSubmit.textContent = 'Enviando…';

    try {
      const payload = await buildPayload();
      let response;
      if (!CONFIG.URL_UPLOAD) {
        // Modo demo: se simula la respuesta de F2
        await Utils.General.wait(700);
        state.demoCounter += 1;
        response = { requestId: `SOL-DEMO-${String(state.demoCounter).padStart(4, '0')}`, status: 'PENDIENTE' };
        Utils.General.log('Solicitud de cargue (demo):', { ...payload, file: { ...payload.file, contentBase64: '…' } });
      } else {
        response = await _send(payload);
      }
      _showResult(payload, response);
    } catch (error) {
      Utils.General.logError('Upload._handleSubmit', error);
      Utils.Toast.error('No se pudo enviar la solicitud. Intenta de nuevo; si persiste, avisa a Sistemas de Gestión.');
    } finally {
      state.sending = false;
      DOM.btnSubmit.disabled = false;
      DOM.btnSubmit.removeAttribute('aria-busy');
      DOM.btnSubmit.textContent = 'Enviar solicitud';
    }
  }

  /** Arma el cuerpo de la solicitud según el contrato F2. */
  async function buildPayload() {
    const type = _requestType();
    const doc = state.selected;
    const file = type === TYPES.RETIRE ? null : DOM.file.files[0];
    const isRG = DOM.type.value === 'RG' && type !== TYPES.RETIRE;
    const band = Catalog.bandOf(DOM.process.value);
    const docs = state.getDocuments();
    const today = Utils.Format.todayISO();

    let code = '';
    if (type === TYPES.NEW_VERSION || type === TYPES.VARIANT || type === TYPES.RETIRE) code = doc.code;

    return {
      requestType: type,
      requestedAt: new Date().toISOString(),
      reviewDeadline: type === TYPES.NEW_VERSION ? _addDays(today, CONFIG.REVIEW_DAYS) : '',
      document: {
        code,
        proposedCode: type === TYPES.NEW
          ? proposedCode(docs, type, { process: DOM.process.value, type: DOM.type.value })
          : type === TYPES.ANNEX ? proposedCode(docs, type, { parentCode: doc.code }) : code,
        parentCode: type === TYPES.ANNEX ? doc.code : '',
        name: DOM.name.value.trim(),
        type: DOM.type.value,
        process: DOM.process.value,
        band: band ? band.code : '',
        company: DOM.company.value,
        // Retiro: conserva la clasificación del documento; externos: emisor (Fase 13)
        classification: type === TYPES.RETIRE ? (doc.classification || Catalog.CLASSIFICATION_INTERNAL) : DOM.classification.value,
        issuer: DOM.issuer.disabled ? '' : DOM.issuer.value.trim(),
        currentVersion: [TYPES.NEW_VERSION, TYPES.VARIANT, TYPES.RETIRE].includes(type) ? (doc.version || '') : '',
      },
      retention: {
        managementYears: isRG ? Number(DOM.retManagement.value) : null,
        centralYears: isRG ? Number(DOM.retCentral.value) : null,
        finalDisposition: isRG ? DOM.disposition.value : '',
        basis: isRG ? DOM.basis.value.trim() : '',
      },
      change: {
        description: DOM.description.value.trim(),
        // Retiro y externos: sin cargos
        preparedBy: DOM.preparedBy.disabled ? '' : DOM.preparedBy.value.trim(),
        approvedBy: DOM.approvedBy.disabled ? '' : DOM.approvedBy.value.trim(),
        // Primera aprobación en F3 (evidencia del contenido); vacío en el retiro
        contentApproverEmail: DOM.approver.disabled ? '' : DOM.approver.value.trim().toLowerCase(),
        notes: DOM.notes.value.trim(),
      },
      // De la cuenta con sesión; F2 lo contrasta con la identidad del token
      requester: {
        name: state.user ? state.user.name : '',
        email: state.user ? state.user.email : '',
        privacyNoticeAccepted: DOM.privacy.checked,
      },
      // Retiro: sin archivo (null)
      file: file ? {
        name: file.name,
        extension: Utils.General.fileExtension(file.name),
        sizeBytes: file.size,
        contentType: file.type || 'application/octet-stream',
        contentBase64: await _readBase64(file),
      } : null,
    };
  }

  /** Lee el archivo como base64 (sin el prefijo data:). @private */
  function _readBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /** Envía la solicitud al flujo F2 con el token de la cuenta y devuelve su respuesta { requestId, status }. @private */
  async function _send(payload) {
    const token = await Auth.getToken();
    const response = await fetch(CONFIG.URL_UPLOAD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
    });
    const data = Utils.Json.parseSafe(await response.text());
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${(data && data.error) || response.statusText}`);
    if (!data || !data.requestId) throw new Error('La respuesta de F2 no trae requestId.');
    return data;
  }

  /** Muestra la confirmación con el número de solicitud. @private */
  function _showResult(payload, response) {
    const escape = Utils.General.escapeHTML;
    const labels = { NEW: 'Documento nuevo', NEW_VERSION: 'Nueva versión', ANNEX: 'Anexo', VARIANT: 'Variante por empresa',
      RETIRE: 'Retiro del documento' };
    const d = payload.document;
    DOM.resultText.innerHTML = `Solicitud <strong>${escape(response.requestId)}</strong> enviada. Sistemas de Gestión la revisará;
      te llegará la respuesta a <strong>${escape(payload.requester.email)}</strong>.`;
    DOM.resultSummary.innerHTML = [
      ['Tipo de cargue', labels[payload.requestType]],
      ['Código', d.code || `${d.proposedCode} (provisional)`],
      ['Documento', d.name],
      ['Empresa', Catalog.companyLabel(d.company)],
      ['Archivo', payload.file ? `${payload.file.name} (${(payload.file.sizeBytes / 1048576).toFixed(2)} MB)` : '— (retiro sin archivo)'],
    ].map(([k, v]) => `<div class="panel-detalle__campo"><dt class="panel-detalle__etiqueta">${escape(k)}</dt>
      <dd class="panel-detalle__valor">${escape(v)}</dd></div>`).join('');

    DOM.form.hidden = true;
    DOM.result.hidden = false;
    DOM.btnSubmit.hidden = true;
    DOM.btnClear.hidden = true;
    DOM.btnAnother.hidden = false;
    DOM.result.querySelector('h3').focus();
    Utils.Toast.success(`Solicitud ${response.requestId} enviada a Sistemas de Gestión.`);
  }


  /* ============================================================
     API PÚBLICA
  ============================================================ */
  return { start, init, proposedCode, buildPayload, TYPES };

})();


/* ================================================================
   PUNTO DE ENTRADA (cargue.html)
================================================================ */
document.addEventListener('DOMContentLoaded', Upload.start);
