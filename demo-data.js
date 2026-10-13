/* ================================================================
   CONSULTA DOCUMENTAL
   demo-data.js · Fase 6 · 2026
   Datos de ejemplo (modo demo). TODO ES INVENTADO: códigos, nombres,
   cargos y fechas no corresponden a documentos reales.
   Usa los 20 encabezados del listado maestro propuesto, tal como
   llegarían del Excel, para ejercitar Utils.Json.normalizeDocuments.
   Cubre: los 10 tipos, los 4 estados, variantes por empresa (mismo
   código, distinta EMPRESA), anexos (-AN01), un vigente sin UBICACIÓN
   y documentos EN REVISIÓN con fecha límite vencida y por vencer
   (respecto a octubre de 2026).
================================================================ */

const DEMO_DOCUMENTS = (() => {

  'use strict';

  /** Arma una fila con los 20 encabezados; `extra` sobrescribe los valores por defecto. */
  const row = (code, name, type, process, status, extra = {}) => ({
    'CÓDIGO': code,
    'NOMBRE DEL DOCUMENTO': name,
    'TIPO': type,
    'PROCESO (SIGLA)': process,
    'BANDA DEL MAPA': '',
    'VERSIÓN': '1',
    'FECHA DE VIGENCIA': '2026-02-02',
    'ESTADO': status,
    'FECHA LÍMITE DE REVISIÓN': '',
    'EMPRESA': 'TODAS',
    'DOCUMENTO PRINCIPAL': '',
    'UBICACIÓN': `#demo/${process}/${code} ${name}.pdf`,
    'RETENCIÓN ARCHIVO DE GESTIÓN (AÑOS)': '',
    'RETENCIÓN ARCHIVO CENTRAL (AÑOS)': '',
    'DISPOSICIÓN FINAL': '',
    'FUNDAMENTO DE LA RETENCIÓN': '',
    'CARGO QUE ELABORA': 'Coordinador de sistemas de gestión',
    'CARGO QUE APRUEBA': 'Gerente general',
    'CONTROL DE CAMBIOS': '',
    'OBSERVACIONES': '',
    ...extra,
  });

  /** Retención típica de un formato (RG): 2 años en gestión + 8 en central. */
  const RETENTION_RG = {
    'RETENCIÓN ARCHIVO DE GESTIÓN (AÑOS)': '2',
    'RETENCIÓN ARCHIVO CENTRAL (AÑOS)': '8',
    'DISPOSICIÓN FINAL': 'SELECCIÓN',
    'FUNDAMENTO DE LA RETENCIÓN': 'Código de Comercio, art. 60',
  };

  return [
    row('GER-CA-071', 'Caracterización del proceso de dirección', 'CA', 'GER', 'VIGENTE', {
      'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2025-11-14',
      'CARGO QUE ELABORA': 'Asistente de gerencia',
      'CONTROL DE CAMBIOS': '2025-11-14 · v1 → v2 · Se actualizan los indicadores del proceso.',
    }),
    row('SGRF-PO-064', 'Política de debida diligencia de contrapartes', 'PO', 'SGRF', 'VIGENTE', {
      'VERSIÓN': '3', 'FECHA DE VIGENCIA': '2026-01-20',
      'CARGO QUE ELABORA': 'Oficial de cumplimiento',
    }),
    row('SG-MA-083', 'Manual del sistema integrado de gestión', 'MA', 'SG', 'VIGENTE', {
      'VERSIÓN': '5', 'FECHA DE VIGENCIA': '2026-03-09',
      'CONTROL DE CAMBIOS': '2026-03-09 · v4 → v5 · Se incorpora la estructura de carpetas por bandas.',
    }),
    row('SG-MA-083-AN01', 'Anexo 1. Matriz de comunicaciones internas', 'MA', 'SG', 'VIGENTE', {
      'VERSIÓN': '5', 'FECHA DE VIGENCIA': '2026-03-09', 'DOCUMENTO PRINCIPAL': 'SG-MA-083',
    }),
    row('SG-MT-076', 'Matriz de riesgos y oportunidades del sistema', 'MT', 'SG', 'VIGENTE', {
      'VERSIÓN': '4', 'FECHA DE VIGENCIA': '2026-05-18',
      'UBICACIÓN': '#demo/SG/SG-MT-076 Matriz de riesgos y oportunidades del sistema.xlsx',
    }),
    row('AUD-PR-062', 'Procedimiento de auditoría interna', 'PR', 'AUD', 'VIGENTE', {
      'VERSIÓN': '3', 'FECHA DE VIGENCIA': '2025-09-01',
      'CARGO QUE ELABORA': 'Auditor interno',
    }),
    row('COM-PR-068', 'Procedimiento de compras y selección de proveedores', 'PR', 'COM', 'VIGENTE', {
      'VERSIÓN': '4', 'FECHA DE VIGENCIA': '2026-04-06',
      'CARGO QUE ELABORA': 'Coordinador de compras', 'CARGO QUE APRUEBA': 'Director administrativo',
      'CONTROL DE CAMBIOS': '2026-04-06 · v3 → v4 · Se agrega la evaluación anual de proveedores.',
    }),
    row('COM-PR-068-AN01', 'Anexo 1. Flujograma de compras', 'PR', 'COM', 'VIGENTE', {
      'VERSIÓN': '4', 'FECHA DE VIGENCIA': '2026-04-06', 'DOCUMENTO PRINCIPAL': 'COM-PR-068',
      'CARGO QUE ELABORA': 'Coordinador de compras', 'CARGO QUE APRUEBA': 'Director administrativo',
    }),
    // Variante por empresa: mismo código, una fila por empresa
    row('COM-RG-087', 'Formato de evaluación de proveedores', 'RG', 'COM', 'VIGENTE', {
      ...RETENTION_RG, 'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2026-04-06', 'EMPRESA': 'LOS COCHES',
      'UBICACIÓN': '#demo/COM/COM-RG-087 Formato de evaluación de proveedores V2.xlsx',
      'CARGO QUE ELABORA': 'Coordinador de compras', 'CARGO QUE APRUEBA': 'Director administrativo',
    }),
    row('COM-RG-087', 'Formato de evaluación de proveedores', 'RG', 'COM', 'VIGENTE', {
      ...RETENTION_RG, 'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2026-04-06', 'EMPRESA': 'LOS AUTOS',
      'UBICACIÓN': '#demo/COM/COM-RG-087 Formato de evaluación de proveedores V2 - LOS AUTOS.xlsx',
      'CARGO QUE ELABORA': 'Coordinador de compras', 'CARGO QUE APRUEBA': 'Director administrativo',
    }),
    // EN REVISIÓN con fecha límite vencida
    row('TAL-PR-074', 'Procedimiento de recepción de vehículos en taller', 'PR', 'TAL', 'EN REVISIÓN', {
      'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2024-08-12', 'FECHA LÍMITE DE REVISIÓN': '2026-08-31',
      'CARGO QUE ELABORA': 'Jefe de taller', 'CARGO QUE APRUEBA': 'Director de posventa',
      'OBSERVACIONES': 'Se revisa el paso de inventario del vehículo al ingreso.',
    }),
    // VIGENTE sin UBICACIÓN (caso de aviso)
    row('TAL-INT-079', 'Instructivo de lavado y entrega de vehículos', 'INT', 'TAL', 'VIGENTE', {
      'VERSIÓN': '1', 'FECHA DE VIGENCIA': '2026-06-15', 'UBICACIÓN': '',
      'CARGO QUE ELABORA': 'Jefe de taller', 'CARGO QUE APRUEBA': 'Director de posventa',
    }),
    row('TAL-RG-091', 'Formato de orden de trabajo de servicio', 'RG', 'TAL', 'VIGENTE', {
      ...RETENTION_RG, 'VERSIÓN': '6', 'FECHA DE VIGENCIA': '2026-07-01',
      'CARGO QUE ELABORA': 'Jefe de taller', 'CARGO QUE APRUEBA': 'Director de posventa',
    }),
    // Documento propio de una sola empresa: su propio consecutivo, sin prefijos
    row('VUS-RG-085', 'Formato de peritaje de vehículos usados', 'RG', 'VUS', 'VIGENTE', {
      ...RETENTION_RG, 'VERSIÓN': '1', 'FECHA DE VIGENCIA': '2026-02-23', 'EMPRESA': 'LOS COCHES CJDR',
      'CARGO QUE ELABORA': 'Coordinador de usados', 'CARGO QUE APRUEBA': 'Director comercial',
    }),
    row('GH-PG-066', 'Programa anual de formación del personal', 'PG', 'GH', 'VIGENTE', {
      'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2026-01-12',
      'CARGO QUE ELABORA': 'Analista de gestión humana', 'CARGO QUE APRUEBA': 'Director de gestión humana',
    }),
    row('GH-RG-089', 'Formato de solicitud de permisos', 'RG', 'GH', 'OBSOLETO', {
      ...RETENTION_RG, 'VERSIÓN': '3', 'FECHA DE VIGENCIA': '2023-05-02',
      'CARGO QUE ELABORA': 'Analista de gestión humana', 'CARGO QUE APRUEBA': 'Director de gestión humana',
      'OBSERVACIONES': 'Reemplazado por la solicitud en la plataforma de nómina.',
    }),
    // EN REVISIÓN con fecha límite por vencer
    row('TYC-GU-072', 'Guía de uso del correo corporativo', 'GU', 'TYC', 'EN REVISIÓN', {
      'VERSIÓN': '1', 'FECHA DE VIGENCIA': '2025-03-03', 'FECHA LÍMITE DE REVISIÓN': '2027-03-31',
      'CARGO QUE ELABORA': 'Coordinador de tecnología', 'CARGO QUE APRUEBA': 'Director administrativo',
    }),
    row('REP-OT-063', 'Tabla de equivalencias de referencias', 'OT', 'REP', 'VIGENTE', {
      'VERSIÓN': '1', 'FECHA DE VIGENCIA': '2026-08-03',
      'CARGO QUE ELABORA': 'Jefe de repuestos', 'CARGO QUE APRUEBA': 'Director de posventa',
    }),
    row('CAR-PR-069', 'Procedimiento de gestión de cobro', 'PR', 'CAR', 'ELIMINADO', {
      'VERSIÓN': '2', 'FECHA DE VIGENCIA': '2022-10-10', 'UBICACIÓN': '',
      'CARGO QUE ELABORA': 'Coordinador de cartera', 'CARGO QUE APRUEBA': 'Director financiero',
      'OBSERVACIONES': 'Retirado sin reemplazo; su código no se reutiliza.',
    }),
  ];

})();
