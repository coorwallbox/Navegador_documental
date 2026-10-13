---
tecnologia: Web
tipo: entregable
proyecto: Consulta_Documental
estado: pendiente
estado_resumen: "Fase 12 completa — siguiente: Fase 13 (ajustes de cumplimiento en el cargue)"
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

Excel almacenado en SharePoint, consultado a través de un flujo de Power Automate. Desde la Fase 6 el modelo sigue la **estructura propuesta del listado maestro de documentos** (22 columnas desde la Fase 12; `Utils.Json.COLUMNS` es el mapeo). Los encabezados se comparan sin distinguir mayúsculas, tildes ni espacios repetidos.

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
| CLASIFICACIÓN | `classification` |
| EMISOR | `issuer` |

Reglas de normalización: código `SIGLA-TIPO-NNN` (anexos `-AN01`); clave del documento = código + empresa (las variantes comparten código); EMPRESA vacía = TODAS; BANDA DEL MAPA vacía se deduce de la sigla con `catalog.js`; CLASIFICACIÓN vacía = INTERNA; la próxima revisión periódica (`nextReviewDate`) no es columna: FECHA DE VIGENCIA + periodo del tipo (3 años; 1 para `DE` y `OT`), y `reviewOverdue` la marca vencida solo en VIGENTE; fechas a ISO (acepta ISO, `DD/MM/YYYY` y número de serie de Excel).

## Estructura de archivos (prevista)

```
Consulta_Documental/
├── docs/
│   ├── 00_README.md
│   ├── 01_INDEX.md
│   ├── 03_TRD.md         # contratos de los flujos F1, F2 y F3
│   ├── 06_IMPLEMENTATION.md
│   └── 07_PROGRESO_RESUMEN.md
├── ds/                   # copiados/adaptados de Design_System_Core (Regla 3): tokens base, estilo «loscoches» y stepper; solo los carga cargue.html
├── img/                  # logo en negativo y favicon (manual de marca Los Coches)
├── tools/
│   └── build_deploy.py   # arma dist/ con la configuración real (config.local.json)
├── .gitignore            # excluye config.local.json y dist/
├── config.js             # configuración de despliegue: en el repositorio, URL vacías (modo demo)
├── config.local.example.json  # plantilla de la configuración real
├── cargue.html           # página independiente de cargue (no se enlaza desde la consulta)
├── upload.js             # lógica de la página de cargue (objeto Upload)
├── config-cargue.js      # configuración del cargue (URL de F2): solo la carga cargue.html
├── catalog.js            # catálogos: tipos, bandas, procesos, empresas
├── demo-data.js          # datos de ejemplo inventados (modo demo)
├── index.html
├── main.js
├── styles.css
└── utils.js
```

**Orden de carga obligatorio:** en `index.html`, `config.js` → `catalog.js` → `utils.js` → `demo-data.js` → `main.js`; en `cargue.html`, `config.js` → `config-cargue.js` → `catalog.js` → `utils.js` → `demo-data.js` → `ds/components/stepper/stepper.core.js` → `upload.js` (`Utils` usa `Catalog`; `App` y `Upload` usan `Utils` y `Catalog`; la carga del listado es `Utils.Data`, compartida).

## Despliegue

El repositorio es público y la URL de un flujo con disparador HTTP permite usarlo a quien la tenga: **las URL nunca van al repositorio**.

1. Copiar `config.local.example.json` a `config.local.json` (excluido de Git) y completar `URL_DOCUMENTS` (flujo F1) y, desde la Fase 15, `URL_UPLOAD` (flujo F2) y `ALLOWED_EMAIL_DOMAINS`.
2. Ejecutar `python tools/build_deploy.py`: genera `dist/` (excluida de Git) con las dos páginas, `config.js` (URL de F1) y `config-cargue.js` (URL de F2 y parámetros del cargue; solo lo carga `cargue.html`, así la consulta no expone la URL de F2). Valida las URL (https) y los parámetros, y falla si falta la configuración.
3. Publicar el contenido de `dist/` **solo en un destino interno** (la página de cargue puede ir en una ubicación aparte, restringida a los líderes de proceso): una página del sitio de SharePoint de Calidad (si el sitio permite servir la aplicación) o, como plan B, Azure Static Web Apps restringido a los usuarios de la empresa. Se prueba en la Fase 14.

Sin URL configurada (el `config.js` del repositorio), la consulta funciona en modo demo con `demo-data.js`. El flujo debe aceptar CORS, porque la página y el flujo están en dominios distintos.

## Funcionalidades principales (previstas)

- Búsqueda por nombre o código del documento (sin distinguir mayúsculas ni tildes).
- Filtros opcionales y combinables: proceso («TAL — Taller», agrupado por banda), banda del mapa, nivel documental (Estratégico, Táctico, Operativo, Evidencia y Externo — se deduce del tipo), tipo, empresa (incluye siempre los documentos de TODAS), estado y revisión periódica (vencida / al día). La banda acota el proceso y el nivel acota el tipo. Botón «Limpiar filtros».
- Enlace directo con filtros en la URL — `?proceso=TAL` (también `banda`, `nivel`, `tipo`, `empresa`, `estado`, `revision`, `q`), sin distinguir mayúsculas ni tildes; un valor inexistente se ignora con aviso. La URL se actualiza al filtrar, para compartir la vista.
- Tabla de resultados: Código, Nombre del documento, Tipo, Proceso, Versión, Empresa, Estado y acciones («Ver más», «Abrir»).
- «Ver más» → panel de detalle deslizante (overlay + aside) con 6 secciones: Identificación (tipo, nivel documental, proceso, banda, empresa, origen, emisor si es externo, clasificación), Vigencia (estado, versión, fecha de vigencia, fecha límite de revisión — marcada «Vencida» si pasó —, próxima revisión periódica — «Vencida» en vigentes), Responsables, Retención (tiempo, disposición final, fundamento), Documentos relacionados (documento principal, anexos y variantes por empresa, navegables dentro del panel) y Control de cambios / Observaciones.
- Botón del archivo (fila y panel), según la extensión de UBICACIÓN: **PDF → «Abrir»** en una pestaña nueva; **cualquier otro formato → «Descargar»** (en SharePoint se agrega `?download=1`; aviso de copia no controlada); sin extensión → «Abrir». Solo VIGENTE y EN REVISIÓN (este con el aviso «Cambio en trámite…»), y nunca los RESERVADOS («solicítalo a Sistemas de Gestión»); aviso si no tiene UBICACIÓN. En modo demo la acción se simula.
- **Cargue de documentos — página independiente `cargue.html`** (`upload.js`; la consulta no la muestra ni la enlaza): formulario en 5 pasos con el stepper de Design_System_Core (tipo de cargue, documento, cambio y responsables, solicitante, archivo; cada paso se valida antes de avanzar y «Enviar solicitud» aparece en el último); un líder de proceso envía una solicitud de documento nuevo, nueva versión, anexo, variante por empresa o retiro (sin archivo; al aprobarse queda ELIMINADO); elige el documento existente con un buscador por código o nombre (sin OBSOLETO ni ELIMINADO) y sus datos se precargan; vista previa del código (provisional: lo confirma SG al aprobar); retención obligatoria para formatos RG; validaciones (obligatorios, años 0–100, correo y dominio, archivo pdf/docx/xlsx/pptx de hasta 20 MB). La solicitud va al flujo F2 y SG la aprueba en F3 antes de publicar (contratos en `03_TRD.md`). En modo demo el envío se simula con un número de solicitud.
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
| EN REVISIÓN | Ámbar | Sí, con aviso «Cambio en trámite» (Fase 12; antes no) |
| OBSOLETO | Rojo | No |
| ELIMINADO | Rojo oscuro | No |

EN REVISIÓN reemplaza a «Por revisar» y «Desactualizado» y lleva FECHA LÍMITE DE REVISIÓN. Pueden abrirse los documentos **VIGENTE** y **EN REVISIÓN** (mientras se decide el cambio, la versión actual sigue siendo la válida, ISO 9001 §7.5.3.1 a); para el resto, y para los de CLASIFICACIÓN **RESERVADA**, el botón queda **deshabilitado** (visible, atenuado, con tooltip y aviso en el pie del panel). La regla única vive en `Utils.Access.check()` (estado con `Utils.Status.isDownloadable()` + clasificación) y se valida también dentro de `_handleOpen` como guarda defensiva. Ocultar el enlace no protege el archivo: la protección real de un reservado son sus permisos en SharePoint, y F1 no envía su UBICACIÓN (`03_TRD.md`).

## Catálogos

`catalog.js` (objeto global `Catalog`) contiene los 10 tipos de documento internos y el tipo `DE` (documento externo), los 4 niveles de la pirámide documental más el nivel «Externo», la clasificación (INTERNA / RESERVADA), los años entre revisiones periódicas por tipo, las bandas del mapa con sus grupos y siglas, los nombres de los procesos, las empresas y la disposición final. Está aparte para poder ajustarlo (la ubicación de SG y otros procesos está pendiente de aprobación) sin tocar el resto.

## Diferencias frente a la referencia

- Filtro opcional (`process`) reemplaza al selector de actor/instalador de Wallbox.
- Panel de detalle deslizante (overlay + aside) es un componente nuevo — Wallbox solo tiene un modal de confirmación.
- No genera un documento nuevo: permite descargar un documento ya existente en SharePoint.
- Sin selección de actor: acceso libre.

## Lecciones aprendidas

_(pendiente — se completa al cerrar el ciclo de aprendizaje del proyecto, con supervisión)_

## Documentación relacionada

Ver [[Entregables/Web/Consulta_Documental/docs/01_INDEX|01_INDEX.md]] para el mapa completo de la carpeta `docs/`.
