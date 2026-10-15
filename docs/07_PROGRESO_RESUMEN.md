# Progreso — Resumen — Consulta_Documental

> Cargar junto con [[Entregables/Web/Consulta_Documental/docs/01_INDEX|01_INDEX.md]] al iniciar cualquier tarea sobre este proyecto.
> Última actualización: 2026-10-15.

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
- Fase 9 (QA y accesibilidad): **completa**.
- **Cambio de alcance (2026-10-13, aprobado):** módulo de cargue de documentos (líderes cargan, SG aprueba; formulario propio + flujo HTTP con medidas de seguridad). La integración se reorganiza: 10 configuración y despliegue, 11 módulo de cargue (interfaz), 12 flujo F1 y publicación interna, 13 flujos F2 y F3, 14 cierre.
- Fase 10 (Configuración y despliegue): **completa**.
- Fase 11 (Módulo de cargue, interfaz en modo demo): **completa**.
- **Cambio de alcance (2026-10-13, aprobado):** ajustes de cumplimiento normativo tras la evaluación crítica frente a ISO 9001 §7.5 y las normas colombianas. Se insertan la Fase 12 (consulta: EN REVISIÓN se puede abrir, clasificación, documentos externos y revisión periódica) y la Fase 13 (cargue: Entra ID, aprobación del contenido con evidencia, aviso de privacidad y avisos al proceso). Las antiguas 12, 13 y 14 pasan a 14, 15 y 16 (ver `06_IMPLEMENTATION.md`).
- Fase 12 (Ajustes de cumplimiento en la consulta): **completa**.
- Fase 13 (Ajustes de cumplimiento en el cargue): **completa**.
- Fase 14 (Flujo F1 de lectura y publicación interna): pendiente de iniciar — depende de algo externo (licencia Premium, Excel como tabla, acceso al SharePoint de Calidad).

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
- Fase 9 validada (2026-10-13). Checklist de accesibilidad y QA (23/23, QA headless):
  - [x] Contraste AA en vista principal, sin resultados, panel y avisos (corregidos 7 tipos de texto con tokens `--color-*-texto`).
  - [x] Estructura: `lang="es"`, un `h1`, regiones, botones con nombre, `alt`, etiquetas, `scope`, `aria-live` en contador y avisos, panel como diálogo modal con título.
  - [x] Teclado: foco visible en cada parada, foco atrapado en el panel, fondo inerte mientras está abierto, Esc devuelve el foco.
  - [x] Reflujo y zoom: 320/375/768/1280 px sin desbordamiento, texto al 200 % sin recortes, logo ≥ 180 px.
  - [x] Movimiento reducido respetado.
  - [x] Datos reales: 0 coincidencias en el commit actual (códigos y nombres del listado real, búsqueda local).
  - [x] Regresión de las Fases 5–8: OK.
- Fase 10 validada con QA headless (2026-10-13): 15/15 (script de despliegue y sus validaciones, modo demo sin configuración, ruta real con F1 simulado y 300 filas, error del flujo, repositorio sin URL, Git ignora la configuración real, 0 errores). Corregidos 2 fallos del script (solo lectura heredado de OneDrive; `URL_UPLOAD` opcional). Hallazgo: el flujo real debe aceptar CORS (se verifica en la Fase 12). Regresión de las Fases 5–9 OK.
- Fase 11 validada con QA headless (2026-10-13): 45/45 (4 casos de cargue, precarga, vista previa del código, validaciones de campos, archivo y correo, envío demo, contrato F2 exacto con flujo simulado, error de F2, accesibilidad, 375/768/1280, 0 errores). `03_TRD.md` creado con los contratos F1, F2 y F3. Corregidos 2 fallos (atributo `hidden` anulado por CSS; errores que no se limpiaban). Regresión de las Fases 5–10 OK.
- Fase 12 validada con QA headless (2026-10-13): 52/52 (EN REVISIÓN se abre con aviso; reservado bloqueado en fila, panel y guarda defensiva; externos con origen, emisor y nivel «Externo»; revisión periódica calculada y marcada solo en vigentes, filtro y `?revision=`; fila sin las columnas nuevas → INTERNA; contraste AA; 375/768/1024/1280 px; regresión de la consulta y de la página de cargue; 0 errores de consola). Búsqueda de datos reales → 0. Revierte la decisión «EN REVISIÓN no se abre» (aprobado por el usuario).
- Fase 13 validada con QA headless (2026-10-13): 54/54 (inicio de sesión con Entra ID en modo demo y con una app de prueba hasta la ventana de Microsoft; token en F2; aviso de privacidad; aprobador del contenido; clasificación y emisor; dominios permitidos; página puente; 375/768/1280 px; contraste AA; 0 errores de consola), `build_deploy.py` con las claves `AUTH_*` y regresión de la consulta 52/52. Datos reales → 0. MSAL.js v5.23.0 copiado en `vendor/msal/`; el caso real con la app registrada en Entra ID queda para la Fase 15.
- Ajuste estético (2026-10-13), pedido por el usuario: la línea punteada del stepper quedaba ~10 px a la izquierda del centro de los círculos (el token `--stepper-connector-left` de 14 px no contaba el relleno ni los bordes del encabezado). Se recalcula en `styles.css` desde los tokens del componente (+1 px en el paso actual, cuyo círculo tiene borde de 2 px), sin tocar la copia de `ds/`. Verificado midiendo con el navegador: desfase 0 px en los 4 primeros pasos a 375, 768 y 1280 px; 0 errores.
- Ajuste posterior al cierre de la Fase 11 (2026-10-13): el cargue pasa a la página independiente `cargue.html` (la consulta no la muestra ni la enlaza) y su configuración (URL de F2) a `config-cargue.js`, que solo carga esa página. QA 50/50 y regresión de las Fases 5–10 OK.
- Ajuste posterior al cierre de la Fase 11 (2026-10-13), stepper: el cargue pasa a 5 pasos con el stepper de Design_System_Core (copia adaptada en `ds/`, con `reset()` agregado). QA 32/32 y regresión de las Fases 5–11 OK.
- Ajuste posterior al cierre de la Fase 11 (2026-10-13), cobertura del listado: quinto caso «Retiro», reglas de F3 completas en `03_TRD.md`, anexos en versión 1, una solicitud por variante y notas fuera de OBSERVACIONES. QA 17/17 y regresión de las Fases 5–11 OK.
- Publicación demo en GitHub Pages (2026-10-15, pedido y aprobado por el usuario; no cierra ninguna fase): se suben los 22 commits locales pendientes (lo publicado era el primer commit del 2026-09-01) solo como demostración; la versión completa va al espacio interno asignado tras la aprobación de las partes interesadas (Fase 14). Antes de subir: búsqueda contra 1061 códigos del listado y las plantillas en `HEAD` y en todos los commits pendientes → 0 códigos reales (solo coinciden encabezados de columna y un cargo genérico); sin URL de flujos, correos reales ni IDs del inquilino (los 2 GUID son constantes públicas de MSAL); `config.js` y `config-cargue.js` vacíos. Nuevo `Utils.DemoNotice`: franja «Versión de demostración» bajo el encabezado de la consulta y del cargue, solo en modo demo. QA headless: franja visible en ambas páginas a 1280 y 375 px sin desbordamiento; con URL de F1 simulada no aparece; 0 errores.

## Bloqueos

- Ninguno. (Resuelto 2026-10-13: el historial local de las Fases 5–9 se reescribió para quitar 3 códigos reales del sistema documental; 0 códigos reales en toda la rama. `git push` sigue requiriendo aprobación del usuario.)

## Siguiente paso

> Aviso de Design_System_Core (2026-10-13): su Fase 15 subió `reset()` al original de `<ds-stepper>` (mismo método que la copia de `ds/components/stepper/stepper.core.js`). Pendiente, como cambio aparte y con aprobación: reemplazar la copia por la del original (lo único que se pierde es el comentario de adaptación) y repetir el QA del cargue.
>
> Aviso de Design_System_Core (2026-10-13): su Fase 16 corrigió en el original el conector descentrado del Stepper (`--stepper-connector-left` como fórmula, +1px en el paso actual), el mismo arreglo que esta consulta aplicó en `styles.css`. Si se reemplaza la copia de `ds/` por el original, esa regla de `styles.css` sobra (da el mismo resultado) y conviene quitarla en el mismo cambio.

> Prueba en entorno de prueba (2026-10-13, no cierra ninguna fase): F1 con disparador manual leyó el listado y vació la UBICACIÓN de los reservados. F3, caso `NEW`, funcionó de punta a punta: 2 aprobaciones, consecutivo, renombrado, carpeta, fila del listado y estado APROBADA. **Hallazgo:** el inquilino no tiene Premium, y F1 y F2 lo necesitan (disparador HTTP). Detalle y diseño en `03_TRD.md` § Hallazgos del entorno de prueba. Pendiente: el camino de rechazo de F3, y confirmar el método del disparador HTTP por CORS.

Fase 14: flujo F1 (lectura) con guía paso a paso y prueba de publicación interna. Necesita del usuario: confirmar licencia Premium de Power Automate y acceso al sitio de SharePoint de Calidad. El listado en Excel ya existe como tabla `ListadoMaestro` (migración del listado actual a las 20 columnas, generada fuera del repositorio, 2026-10-13). Se probó en local con la consulta, simulando la respuesta de F1 (todo texto, fechas como número de serie), a 375, 768 y 1280 px: 0 errores. Las filas sin nombre no se muestran; los códigos repetidos se muestran por separado. Antes de usarlo, Sistemas de Gestión depura los casos de su hoja «Revisar».
