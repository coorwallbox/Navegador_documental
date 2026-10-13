# Progreso — Resumen — Consulta_Documental

> Cargar junto con [[Entregables/Web/Consulta_Documental/docs/01_INDEX|01_INDEX.md]] al iniciar cualquier tarea sobre este proyecto.
> Última actualización: 2026-09-01.

## Estado actual

- Fase 0 (Setup de contexto): **completa**. Docs mínimos creados y aprobados.
- Fase 1 (Estructura base + tabla con modo demo): **completa**. `index.html`, `main.js`, `utils.js`, `styles.css` creados.
- Fase 2 (Panel de detalle deslizante): **completa**.
- Fase 3 (Descarga de documentos): **completa**.
- Fase 4 (Responsive y estados de tabla): **completa**.
- Fase 5 (Integración real con Power Automate): pendiente de iniciar.

## Validación

- Fase 0 validada: contenido de `00_README`, `01_INDEX`, `06_IMPLEMENTATION` y `07_PROGRESO_RESUMEN` aprobado por el usuario el 2026-09-01.
- Fase 1 validada con QA automatizado en navegador headless (2026-09-01): 0 errores de consola, 12 documentos demo cargan correctamente, filtro de Proceso poblado dinámicamente, búsqueda por palabra clave y filtro por proceso funcionan solos y combinados, botones de acción muestran su toast placeholder.
- Fase 1 (ajustes visuales posteriores): alineación de la barra de búsqueda, texto de ayuda eliminado, header con gradiente `#000328 → #00458E`, líneas de tabla en `#F8F8FA` — verificado con captura de pantalla.
- Fase 2 validada con QA automatizado en navegador headless (2026-09-01): el panel abre/cierra por click en overlay, tecla Esc y botón cerrar; foco gestionado correctamente (va al botón cerrar al abrir, regresa al disparador al cerrar); scroll de fondo bloqueado mientras está abierto; datos del documento se muestran correctamente formateados (fechas en español).
- Fase 2 (ajuste): se agregaron Tipo, Proceso y Estado al panel (además de Versión, fechas, Responsable, áreas aplicables y retención); el Estado reutiliza el badge de color de la tabla (`_statusClass`) — verificado que un documento "Obsoleto" muestra el badge rojo correcto y de tamaño compacto.

- Fase 3 validada con QA automatizado en navegador headless (2026-09-01): descarga funcional desde la fila y desde el panel de detalle, nombre de archivo generado correctamente, aviso cuando `location` está vacío.
- Configuración de estados (2026-09-01): se agregó `Utils.Status` (única fuente de verdad para los 5 estados, su color de badge y la regla de descarga) y se aplicó en tabla y panel — verificado con QA headless que los 5 estados renderizan su color correcto y que "Descargar" solo está habilitado para "Vigente" (fila, panel y guarda defensiva en `_handleDownload`).
- **Bug encontrado y corregido en esta iteración:** la hoja de estilos nunca tuvo la regla `.btn:disabled` (se perdió al simplificar frente a la referencia en la Fase 1) — los botones "deshabilitados" se veían y se comportaban como habilitados. Se agregó la regla en `styles.css`; confirmado con `getComputedStyle` que ahora `opacity: 0.45`, `cursor: not-allowed` y `pointer-events: none` aplican correctamente.

- Fase 4 validada con QA + capturas en 375px/768px/1280px (2026-09-01): 0 desbordamiento horizontal del body, tabla con scroll horizontal propio + pista visual en anchos <1024px, panel de detalle a pantalla completa en móvil, los 3 estados de tabla (cargando/sin resultados/sin datos) se ven y comportan correctamente.
- **Bug encontrado y corregido:** columna Código sin `white-space: nowrap` en `<td>` — se partía en 3 líneas en móvil. Corregido en `styles.css`.

## Bloqueos

- Ninguno.

## Siguiente paso

Iniciar Fase 5: integración real con Power Automate — reemplazar `CONFIG.MODO_DEMO` y `CONFIG.URL_DOCUMENTS` en `main.js` por el flujo real que consulta el Excel en SharePoint.
