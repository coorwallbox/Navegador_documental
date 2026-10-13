# Progreso — Resumen — Consulta_Documental

> Cargar junto con [[Entregables/Web/Consulta_Documental/docs/01_INDEX|01_INDEX.md]] al iniciar cualquier tarea sobre este proyecto.
> Última actualización: 2026-10-13.

## Estado actual

- Fase 0 (Setup de contexto): **completa**. Docs mínimos creados y aprobados.
- Fase 1 (Estructura base + tabla con modo demo): **completa**. `index.html`, `main.js`, `utils.js`, `styles.css` creados.
- Fase 2 (Panel de detalle deslizante): **completa**.
- Fase 3 (Descarga de documentos): **completa**.
- Fase 4 (Responsive y estados de tabla): **completa**.
- **Cambio de alcance (2026-10-13, aprobado):** alineación con la estructura propuesta del listado maestro de documentos + logo de Los Coches. Fases nuevas 5–9; Power Automate pasa a la Fase 10 y el cierre a la 11 (ver `06_IMPLEMENTATION.md`).
- Fase 5 (Logo y favicon): **completa**.
- Fase 6 (Modelo de datos de la propuesta): **completa**.
- Fase 7 (Filtros, búsqueda y enlace por URL, + nivel documental): **completa**.
- Fase 8 (Tabla y panel de detalle): **completa**.
- Fase 9 (QA y accesibilidad): pendiente de iniciar.

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

- Fase 5 validada con QA headless servido por HTTP local (2026-10-13) en 375/768/1280 px: logotipo visible de 186 px (mínimo 180, lámina 09), proporción conservada, título fuera de la caja del SVG y sin recorte, favicon SVG responde 200, 0 desbordamiento horizontal, 0 errores de consola y 0 respuestas ≥ 400. Revisión visual de las capturas a 375 y 1280 px. Rótulos de versión actualizados (`v0.2`, pie sin número de fase).
- Fase 6 validada con QA headless (2026-10-13): 20/20 comprobaciones del modelo (20 columnas, tolerancia de encabezados y fechas, códigos `SIGLA-TIPO-NNN`, variantes por código+empresa, anexos, bandas, cobertura de tipos y estados, badges, regla de descarga con EN REVISIÓN bloqueado), 0 errores de consola, 0 referencias a estados retirados, 0 coincidencias de códigos demo con el listado real. Regresión de la Fase 5 OK.
- Fase 7 validada con QA headless (2026-10-13): 27/27 comprobaciones (parámetros de URL, búsqueda por nombre y código, filtros dependientes banda→proceso y nivel→tipo, empresa con TODAS, URL sincronizada, «Limpiar filtros», nivel en el panel, etiquetas y teclado, 0 desbordamiento en 375/768/1280, 0 errores). Se agregó el nivel documental a pedido del usuario. Regresión de las Fases 5 y 6 OK.
- Fase 8 validada con QA headless (2026-10-13): 30/30 comprobaciones (tabla con Versión y Empresa, panel de 6 secciones con los 19 campos, navegación principal ↔ anexo y entre variantes, fecha límite vencida marcada, «Abrir» solo VIGENTE en fila/panel/guarda, aviso de vigente sin UBICACIÓN, pestaña nueva, 3 estados de tabla, foco/Esc, 0 desbordamiento con panel abierto en 375/768/1280, 0 errores). Etiqueta «Nivel documental» a pedido del usuario. Regresión de las Fases 5–7 OK.
- Ajuste posterior al cierre de la Fase 8 (2026-10-13): PDF → «Abrir», otros formatos → «Descargar» (`?download=1` en SharePoint). QA 11/11 y regresión de las Fases 5–8 OK. Pendiente para la Fase 10: probarlo con enlaces reales (PDF, xlsx, docx).

## Bloqueos

- Ninguno.

## Siguiente paso

Iniciar Fase 9: QA y accesibilidad — contraste, orden de foco, lectores de pantalla en los 3 anchos y comprobación de que el repositorio público no contiene datos reales.
