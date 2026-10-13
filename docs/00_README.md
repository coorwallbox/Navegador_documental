---
tecnologia: Web
tipo: entregable
proyecto: Consulta_Documental
estado: pendiente
estado_resumen: "Fase 9 pendiente (QA y accesibilidad)"
stack: "HTML + CSS + JS vainilla"
descripcion: "Formulario de búsqueda documental (palabra clave + filtro por proceso) con tabla de resultados, panel de detalle deslizante y descarga condicionada al estado del documento"
aliases: [Consulta_Documental]
---

# Consulta_Documental — README

> Ubicación: `Entregables/Web/` (entregable).
> Última revisión: 2026-10-13.

## Propósito

Formulario web de búsqueda documental que permite consultar documentos mediante palabra clave (por nombre del documento) y un filtro obligatorio por proceso, presentando los resultados en una tabla organizada con panel de detalle y descarga del documento original.

## Contexto

Referencia de arquitectura: [[Cotizaciones_Wallbox]] (mismo tema `Formularios_Web`) — patrón `App`/`Utils`, estado centralizado, modo demo, integración con Excel en SharePoint vía Power Automate. El código original de esa referencia no se modifica; esta es una solución nueva en carpeta propia.

## Origen de datos

Excel almacenado en SharePoint, consultado a través de un flujo de Power Automate. Desde la Fase 6 el modelo sigue la **estructura propuesta del listado maestro de documentos** (20 columnas; `Utils.Json.COLUMNS` es el mapeo). Los encabezados se comparan sin distinguir mayúsculas, tildes ni espacios repetidos.

| Columna Excel | Propiedad interna |
|---|---|
| CÓDIGO | `code` |
| NOMBRE DEL DOCUMENTO | `documentName` |
| TIPO | `type` |
| PROCESO (SIGLA) | `process` |
| BANDA DEL MAPA | `band` |
| VERSIÓN | `version` |
| FECHA DE VIGENCIA | `effectiveDate` |
| ESTADO | `status` |
| FECHA LÍMITE DE REVISIÓN | `reviewDeadline` |
| EMPRESA | `company` |
| DOCUMENTO PRINCIPAL | `parentCode` |
| UBICACIÓN | `location` |
| RETENCIÓN ARCHIVO DE GESTIÓN (AÑOS) | `retentionManagementYears` |
| RETENCIÓN ARCHIVO CENTRAL (AÑOS) | `retentionCentralYears` |
| DISPOSICIÓN FINAL | `finalDisposition` |
| FUNDAMENTO DE LA RETENCIÓN | `retentionBasis` |
| CARGO QUE ELABORA | `preparedBy` |
| CARGO QUE APRUEBA | `approvedBy` |
| CONTROL DE CAMBIOS | `changeLog` |
| OBSERVACIONES | `notes` |

Reglas de normalización: código `SIGLA-TIPO-NNN` (anexos `-AN01`); clave del documento = código + empresa (las variantes comparten código); EMPRESA vacía = TODAS; BANDA DEL MAPA vacía se deduce de la sigla con `catalog.js`; fechas a ISO (acepta ISO, `DD/MM/YYYY` y número de serie de Excel).

## Estructura de archivos (prevista)

```
Consulta_Documental/
├── docs/
│   ├── 00_README.md
│   ├── 01_INDEX.md
│   ├── 06_IMPLEMENTATION.md
│   └── 07_PROGRESO_RESUMEN.md
├── img/                  # logo en negativo y favicon (manual de marca Los Coches)
├── catalog.js            # catálogos: tipos, bandas, procesos, empresas
├── demo-data.js          # datos de ejemplo inventados (modo demo)
├── index.html
├── main.js
├── styles.css
└── utils.js
```

**Orden de carga obligatorio en `index.html`:** `catalog.js` → `utils.js` → `demo-data.js` → `main.js` (`Utils` usa `Catalog`; `App` depende de los tres).

## Funcionalidades principales (previstas)

- Búsqueda por nombre o código del documento (sin distinguir mayúsculas ni tildes).
- Filtros opcionales y combinables: proceso («TAL — Taller», agrupado por banda), banda del mapa, nivel documental (Estratégico, Táctico, Operativo, Evidencia — se deduce del tipo), tipo, empresa (incluye siempre los documentos de TODAS) y estado. La banda acota el proceso y el nivel acota el tipo. Botón «Limpiar filtros».
- Enlace directo con filtros en la URL — `?proceso=TAL` (también `banda`, `nivel`, `tipo`, `empresa`, `estado`, `q`), sin distinguir mayúsculas ni tildes; un valor inexistente se ignora con aviso. La URL se actualiza al filtrar, para compartir la vista.
- Tabla de resultados: Código, Nombre del documento, Tipo, Proceso, Versión, Empresa, Estado y acciones («Ver más», «Abrir»).
- «Ver más» → panel de detalle deslizante (overlay + aside) con 6 secciones: Identificación (tipo, nivel documental, proceso, banda, empresa), Vigencia (estado, versión, fecha de vigencia, fecha límite de revisión — marcada «Vencida» si pasó), Responsables, Retención (tiempo, disposición final, fundamento), Documentos relacionados (documento principal, anexos y variantes por empresa, navegables dentro del panel) y Control de cambios / Observaciones.
- «Abrir» (fila y panel) → abre el archivo de UBICACIÓN en una pestaña nueva (los enlaces de SharePoint ignoran el atributo `download`). Solo VIGENTE; aviso si un vigente no tiene UBICACIÓN. En modo demo la apertura se simula.
- Modo demo (datos de ejemplo embebidos) para desarrollar sin depender de Power Automate.
- Acceso libre, sin selección de actor/rol.

## Patrones reutilizados de Cotizaciones_Wallbox

- Revealing module pattern + IIFE (`App` / `Utils`).
- Estado centralizado y `Utils.Json` para normalizar/mapear respuestas de Power Automate (columnas Excel → propiedades internas).
- `Utils.Loader` (overlay de carga), `Utils.Mensaje` (toasts), `Utils.Animar` (micro-interacciones).
- Debounce en el campo de búsqueda.
- Estados de tabla: sin datos / cargando / sin resultados.
- Design tokens CSS (variables de color, tipografía, espaciado) y estructura de `styles.css` por secciones.

## Configuración de estados de documentos

Los 4 estados de la propuesta (`Utils.Status` en `utils.js`, única fuente de verdad; el dato va en mayúsculas y se muestra en minúsculas con `Utils.Status.label`):

| Estado | Color de badge | ¿Permite abrir/descargar? |
|---|---|---|
| VIGENTE | Verde | Sí |
| EN REVISIÓN | Ámbar | No (decisión 2026-10-13) |
| OBSOLETO | Rojo | No |
| ELIMINADO | Rojo oscuro | No |

EN REVISIÓN reemplaza a «Por revisar» y «Desactualizado» y lleva FECHA LÍMITE DE REVISIÓN. Solo los documentos **VIGENTE** pueden abrirse; para el resto el botón «Abrir» queda **deshabilitado** (visible, atenuado, con tooltip y aviso en el pie del panel). La regla vive en `Utils.Status.isDownloadable()` y se valida también dentro de `_handleOpen` como guarda defensiva.

## Catálogos

`catalog.js` (objeto global `Catalog`) contiene los 10 tipos de documento, los 4 niveles de la pirámide documental, las bandas del mapa con sus grupos y siglas, los nombres de los procesos, las empresas y la disposición final. Está aparte para poder ajustarlo (la ubicación de SG y otros procesos está pendiente de aprobación) sin tocar el resto.

## Diferencias frente a la referencia

- Filtro opcional (`process`) reemplaza al selector de actor/instalador de Wallbox.
- Panel de detalle deslizante (overlay + aside) es un componente nuevo — Wallbox solo tiene un modal de confirmación.
- No genera un documento nuevo: permite descargar un documento ya existente en SharePoint.
- Sin selección de actor: acceso libre.

## Lecciones aprendidas

_(pendiente — se completa al cerrar el ciclo de aprendizaje del proyecto, con supervisión)_

## Documentación relacionada

Ver [[Entregables/Web/Consulta_Documental/docs/01_INDEX|01_INDEX.md]] para el mapa completo de la carpeta `docs/`.
