/* ================================================================
   CONSULTA DOCUMENTAL
   catalog.js · Fase 6 · 2026
   Catálogos de la estructura propuesta del listado maestro
   (tipos de documento, bandas del mapa, procesos, empresas y
   disposición final). Archivo independiente para poder ajustarlo
   o reemplazarlo sin tocar el resto de la aplicación.
   Se carga antes que utils.js y main.js.
================================================================ */

const Catalog = (() => {

  'use strict';

  /** Los 10 tipos de documento (sigla → nombre). */
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

  /** Nombre del tipo por su sigla (o la sigla si no está en el catálogo). */
  function typeName(code) {
    const found = TYPES.find((t) => t.code === code);
    return found ? found.name : code;
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

  return { TYPES, PROCESS_NAMES, BANDS, COMPANY_ALL, COMPANIES, DISPOSITIONS, typeName, processName, bandOf };

})();
