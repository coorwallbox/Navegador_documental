/* ================================================================
   CONSULTA DOCUMENTAL
   catalog.js · Fase 6 · 2026 (niveles: Fase 7; externos, clasificación
   y revisión periódica: Fase 12)
   Catálogos de la estructura propuesta del listado maestro
   (tipos y niveles de documento, bandas del mapa, procesos, empresas,
   disposición final, clasificación y periodos de revisión). Archivo independiente para poder ajustarlo
   o reemplazarlo sin tocar el resto de la aplicación.
   Se carga antes que utils.js y main.js.
================================================================ */

const Catalog = (() => {

  'use strict';

  /** Los 10 tipos de documento internos y el tipo DE de los externos (sigla → nombre). */
  const TYPES = [
    { code: 'CA',  name: 'Caracterización' },
    { code: 'PO',  name: 'Política' },
    { code: 'MA',  name: 'Manual' },
    { code: 'PR',  name: 'Procedimiento' },
    { code: 'PG',  name: 'Programa' },
    { code: 'INT', name: 'Instructivo' },
    { code: 'GU',  name: 'Guía' },
    { code: 'MT',  name: 'Matriz' },
    { code: 'RG',  name: 'Formato / registro' },
    { code: 'OT',  name: 'Otros documentos' },
    // Origen externo: normas, leyes, manuales y boletines del fabricante (ISO 9001 §7.5.3.2)
    { code: 'DE',  name: 'Documento externo' },
  ];

  /** Tipo de los documentos de origen externo. */
  const EXTERNAL_TYPE = 'DE';

  /**
   * Niveles de la pirámide documental (sección 3.2 de la propuesta:
   * Directrices, Forma de actuar, Controles operacionales, Evidencia),
   * con los nombres acordados para la consulta. Se deducen del tipo.
   * Los externos van fuera de la pirámide, en el nivel «Externo» (Fase 12).
   */
  const LEVELS = [
    { code: '1', name: 'Estratégico', types: ['CA', 'PO', 'MA'] },
    { code: '2', name: 'Táctico',     types: ['PR', 'PG'] },
    { code: '3', name: 'Operativo',   types: ['INT', 'GU', 'MT'] },
    { code: '4', name: 'Evidencia',   types: ['RG', 'OT'] },
    { code: 'E', name: 'Externo',     types: ['DE'] },
  ];

  /** Nombre de cada proceso por su sigla. */
  const PROCESS_NAMES = {
    GER: 'Gerencia general', SGRF: 'Sagrilaf',
    GVE: 'Ventas nuevos', VUS: 'Ventas usados', FYO: 'Financieras y otros', VACC: 'Accesorios',
    ALI: 'Alistamiento y logística', WAL: 'Wallbox',
    TAL: 'Taller', ASE: 'Aseguradora', REP: 'Repuestos', CNTC: 'Contact center',
    GH: 'Gestión humana', TYC: 'Tecnología', ARC: 'Archivo', COM: 'Compras', TRA: 'Trámites',
    MER: 'Mercadeo', MAN: 'Mantenimiento', JSC: 'Jurídica y servicio al cliente',
    CAR: 'Cartera', TES: 'Tesorería', CON: 'Contabilidad', FAC: 'Facturación',
    AUD: 'Auditoría', SG: 'Sistemas de gestión',
  };

  /**
   * Bandas del mapa, en su orden. `code` es el valor
   * de la columna BANDA DEL MAPA; `groups` agrupa las siglas como en el mapa.
   * SG en Evaluación y mejora: recomendado, pendiente de aprobación.
   */
  const BANDS = [
    { code: 'ESTRATÉGICOS', name: 'Estratégicos', groups: [
      { name: null, processes: ['GER', 'SGRF'] },
    ] },
    { code: 'MISIONALES', name: 'Misionales', groups: [
      { name: 'Comercial', processes: ['GVE', 'VUS', 'FYO', 'VACC', 'ALI', 'WAL'] },
      { name: 'Posventa',  processes: ['TAL', 'ASE', 'REP', 'CNTC'] },
    ] },
    { code: 'APOYO', name: 'Apoyo', groups: [
      { name: 'Administrativos', processes: ['GH', 'TYC', 'ARC', 'COM', 'TRA', 'MER', 'MAN', 'JSC'] },
      { name: 'Financieros',     processes: ['CAR', 'TES', 'CON', 'FAC'] },
    ] },
    { code: 'EVALUACIÓN Y MEJORA', name: 'Evaluación y mejora', groups: [
      { name: null, processes: ['AUD', 'SG'] },
    ] },
  ];

  /** Valores de la columna EMPRESA. TODAS vale para las tres empresas. */
  const COMPANY_ALL = 'TODAS';
  const COMPANIES = [COMPANY_ALL, 'LOS COCHES', 'LOS AUTOS', 'LOS COCHES CJDR'];

  /** Valores de la columna DISPOSICIÓN FINAL. */
  const DISPOSITIONS = ['CONSERVACIÓN TOTAL', 'ELIMINACIÓN', 'SELECCIÓN', 'DIGITALIZACIÓN'];

  /**
   * Valores de la columna CLASIFICACIÓN. Vacía = INTERNA. Un documento
   * RESERVADA no muestra su archivo en la consulta (Ley 1581/2012, SAGRILAFT);
   * la protección real son los permisos del archivo en SharePoint.
   */
  const CLASSIFICATION_INTERNAL = 'INTERNA';
  const CLASSIFICATION_RESERVED = 'RESERVADA';
  const CLASSIFICATIONS = [CLASSIFICATION_INTERNAL, CLASSIFICATION_RESERVED];

  /**
   * Años entre revisiones periódicas, por tipo. La próxima revisión es
   * FECHA DE VIGENCIA + periodo. Los externos se verifican cada año
   * (que la norma o el manual sigan vigentes) y OT también (sección 3.2).
   */
  const REVIEW_YEARS_DEFAULT = 3;
  const REVIEW_YEARS_BY_TYPE = { DE: 1, OT: 1 };

  /** Nombre del tipo por su sigla (o la sigla si no está en el catálogo). */
  function typeName(code) {
    const found = TYPES.find((t) => t.code === code);
    return found ? found.name : code;
  }

  /** Nivel (objeto de LEVELS) al que pertenece un tipo, o null. */
  function levelOf(typeCode) {
    return LEVELS.find((level) => level.types.includes(typeCode)) || null;
  }

  /** Texto visible de una empresa ("LOS COCHES CJDR" → "Los Coches CJDR"). */
  function companyLabel(company) {
    if (company === COMPANY_ALL) return 'Todas';
    return String(company).toLowerCase()
      .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
      .replace(/\bCjdr\b/, 'CJDR');
  }

  /** Años entre revisiones periódicas de un tipo de documento. */
  function reviewYears(typeCode) {
    return REVIEW_YEARS_BY_TYPE[typeCode] || REVIEW_YEARS_DEFAULT;
  }

  /** Indica si un tipo corresponde a un documento de origen externo. */
  function isExternal(typeCode) {
    return typeCode === EXTERNAL_TYPE;
  }

  /** Nombre del proceso por su sigla (o cadena vacía si no está). */
  function processName(code) {
    return PROCESS_NAMES[code] || '';
  }

  /** Banda (objeto de BANDS) a la que pertenece una sigla, o null. */
  function bandOf(processCode) {
    return BANDS.find((band) =>
      band.groups.some((group) => group.processes.includes(processCode))) || null;
  }

  return {
    TYPES, EXTERNAL_TYPE, LEVELS, PROCESS_NAMES, BANDS, COMPANY_ALL, COMPANIES, DISPOSITIONS,
    CLASSIFICATION_INTERNAL, CLASSIFICATION_RESERVED, CLASSIFICATIONS,
    typeName, levelOf, companyLabel, processName, bandOf, reviewYears, isExternal,
  };

})();
