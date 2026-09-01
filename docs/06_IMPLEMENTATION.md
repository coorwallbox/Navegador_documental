# Checklist de implementación — Consulta_Documental

## Fase 0 — Setup de contexto

- [x] Crear docs mínimos (`00_README`, `01_INDEX`, `07_PROGRESO_RESUMEN`, `06_IMPLEMENTATION`).
- [x] Validación: docs creados y aprobados por el usuario (2026-09-01).

## Fase 1 — Estructura base + tabla con modo demo

- [x] Maquetar `index.html`: encabezado, filtro Proceso opcional, buscador por palabra clave (Nombre del documento), tabla de resultados.
- [x] `main.js` / `utils.js`: estado centralizado, datos de ejemplo (modo demo, 12 documentos) con las 12 columnas, filtro por Proceso (opcional) + búsqueda por Nombre del documento.
- [x] Validación: verificado con navegador headless (QA automatizado) — 0 errores de consola, 12 documentos demo cargan, select de Proceso se puebla con los 5 procesos reales, búsqueda por palabra clave y filtro por proceso funcionan de forma independiente y combinada (incluido el caso de 0 resultados), botones "Ver más"/"Descargar" muestran el toast placeholder correspondiente a su fase futura.

## Fase 2 — Panel de detalle deslizante

- [x] Botón "Ver más" por fila → overlay + aside deslizante con el resto de columnas (Versión, Fecha de emisión, Fecha de aprobación, Responsable, Usuarios/áreas aplicables, Tiempo de retención).
- [x] Validación: verificado con navegador headless — el panel abre y cierra correctamente por click en overlay, tecla Esc y botón cerrar; el foco se mueve al botón cerrar al abrir y regresa al botón "Ver más" que lo disparó al cerrar; el scroll del fondo se bloquea mientras está abierto; el botón "Descargar" del panel muestra el aviso de la Fase 3 pendiente.

## Fase 3 — Descarga de documentos

- [x] Botón "Descargar" en cada fila y en el panel de detalle usa la columna `location` (Ubicación) — `Utils.General.downloadFromURL` crea un enlace temporal con el nombre de archivo `código_nombre.extensión`.
- [x] Validación: QA en navegador headless — descarga funcional en modo demo desde la fila y desde el panel; nombre de archivo generado correctamente conservando la extensión; aviso si `location` viene vacío.
- [x] **Bug encontrado y corregido durante la validación:** el contenedor de toasts (fijo abajo-derecha) quedaba sobre el botón "Descargar" del panel (también abajo-derecha) y bloqueaba el clic hasta que el toast expiraba. Se movieron los toasts a abajo-izquierda (`styles.css`), eliminando el choque con el panel deslizante en cualquier ancho de pantalla.

## Fase 4 — Responsive y estados de tabla

- Breakpoints (móvil / tablet / escritorio).
- Estados de tabla: cargando / sin resultados / sin datos.
- Validación mínima: probado visualmente en al menos 3 anchos de pantalla.

## Fase 5 — Integración real con Power Automate

- Reemplazar el modo demo por el flujo real que consulta el Excel en SharePoint.
- Validación mínima: datos reales cargan correctamente end-to-end (búsqueda, filtro y descarga).

## Fase 6 — Cierre

- QA final y revisión de accesibilidad.
- Ciclo de aprendizaje (lecciones aprendidas) — ver `IDENTIDAD.md` §4.
- Propuesta de actualización de `INDICE.md` temático (Formularios_Web), con aprobación explícita antes de escribir.
