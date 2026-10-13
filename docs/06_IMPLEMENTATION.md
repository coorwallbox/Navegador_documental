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

- [x] Breakpoints (móvil 375px / tablet 768px / escritorio 1280px), tabla con scroll horizontal propio (`.tabla-wrapper`) y pista visual "Desliza para ver más columnas →" (solo visible por debajo de 1024px).
- [x] Estados de tabla: cargando (skeleton) / sin resultados / sin datos — probados forzando cada estado.
- [x] Validación: QA + capturas de pantalla en los 3 anchos — 0 desbordamiento horizontal del body en ninguno, panel de detalle a pantalla completa en móvil, tabla y barra de búsqueda se adaptan correctamente.
- [x] **Bug encontrado y corregido durante la validación:** la columna Código no tenía `white-space: nowrap` en las celdas (`<td>`, solo lo tenía el `<th>`), causando que códigos como "PR-COM-001" se partieran en 3 líneas al angostarse la columna en móvil. Corregido en `styles.css`.

## Cambio de alcance (2026-10-13) — alineación con la propuesta del listado maestro

Aprobado por el usuario el 2026-10-13: la consulta se alinea con la estructura propuesta del listado maestro de documentos (nueva versión del procedimiento de control documental) y lleva el logo de Los Coches. Se insertan las Fases 5 a 9; las antiguas «Fase 5 — Integración real con Power Automate» y «Fase 6 — Cierre» (nunca iniciadas) pasan a ser las Fases 10 y 11, sin cambio de contenido.

Decisiones aprobadas:
- Solo **VIGENTE** permite abrir/descargar; **EN REVISIÓN no** (tampoco OBSOLETO ni ELIMINADO).
- Catálogo de procesos (siglas, nombres y bandas) en un archivo propio `catalog.js`, con siglas y nombres, reemplazable sin tocar el resto.
- Clave de un documento = **código + empresa**: puede haber varias filas con el mismo código y distinta EMPRESA; TODAS vale para las tres empresas.
- Filtro por empresa: al elegir una empresa se muestran también los documentos con EMPRESA = TODAS.
- Botón del archivo según su formato (decisión posterior, 2026-10-13): PDF → «Abrir» en pestaña nueva; cualquier otro formato → «Descargar» (en SharePoint con `?download=1`), con aviso de copia no controlada; sin extensión → «Abrir».
- Solo datos de ejemplo inventados en el código (repositorio público).

## Fase 5 — Logo y favicon

- [x] Copiar `loscoches_logo_horizontal_negativo.svg` y `favicon.svg` (manual de marca) a `img/`; logo en el encabezado y favicon en `<link rel="icon">`. Encabezado en dos líneas por debajo de 600 px. Actualizar los rótulos de versión obsoletos (encabezado y pie).
- [x] Validación (headless, 375/768/1280 px): logo visible ≥ 180 px de ancho en los 3 anchos (medido sobre el logo dentro del SVG), proporción conservada, el título no se recorta, no se superpone ni invade la caja del SVG (área de protección ½x), favicon carga sin 404, 0 desbordamiento horizontal y 0 errores de consola.
  - Resultado (2026-10-13, página servida por HTTP local): el logotipo ocupa 1073,5 de las 1200 unidades del viewBox (`getBBox`); con la imagen a 208 px de ancho, el logo visible mide **186 px** en los 3 anchos y la proporción se mantiene (208×50,6). Las 9 comprobaciones pasan en 375, 768 y 1280 px. En 375 px el título queda debajo del logo; desde 600 px van en una sola fila, con un separador fuera de la caja del SVG.

## Fase 6 — Modelo de datos de la propuesta

- [x] `Utils.Status` con 4 estados (VIGENTE, EN REVISIÓN, OBSOLETO, ELIMINADO); `catalog.js` con los 10 tipos, bandas, procesos y empresas; `Utils.Json` mapea las 20 columnas; datos demo inventados (~18) en formato SIGLA-TIPO-NNN que cubren los 10 tipos, los 4 estados, variantes por empresa, 2 anexos, un vigente sin UBICACIÓN y EN REVISIÓN con fecha límite vencida y no vencida. Actualizar `00_README` (columnas y estados).
- [x] Validación: una fila con los 20 encabezados exactos se normaliza a las 20 propiedades; todos los códigos demo cumplen `SIGLA-TIPO-NNN(-ANnn)`; sin códigos repetidos salvo variantes con distinta EMPRESA; todo anexo apunta a un principal existente; toda sigla pertenece a una banda; los 4 badges con su color; ninguna referencia a los estados retirados.
  - Resultado (2026-10-13, QA headless servido por HTTP local): 20/20 comprobaciones OK — 20 columnas mapeadas; tolerancia de encabezados (minúsculas, sin tilde, espacios dobles), estado sin tilde, fecha serie de Excel y `DD/MM/YYYY`; 19 filas demo (18 códigos + 1 variante `COM-RG-087` LOS COCHES/LOS AUTOS), 0 códigos inválidos, 0 claves código+empresa repetidas, 2 anexos con principal existente, 10 tipos, 4 estados, todas las siglas en su banda, un vigente sin UBICACIÓN, EN REVISIÓN vencida y por vencer, formatos RG con retención; 4 colores de badge distintos y 0 neutros; Descargar habilitado solo en VIGENTE (filas y panel, incluido EN REVISIÓN deshabilitado); 0 errores de consola. `grep` de estados y campos retirados: 0 coincidencias. Códigos demo contra los 997 códigos reales del listado (`cruce.json`, local): 0 coincidencias. Regresión de la Fase 5 en 375/768/1280: OK.
  - Además de lo previsto: datos demo separados en `demo-data.js` (fácil de retirar en la Fase 10) y panel de detalle adaptado a los campos nuevos (Fecha de vigencia, Empresa, Cargos, Retención) para que no se rompiera; la versión completa del panel sigue en la Fase 8.

## Fase 7 — Filtros, búsqueda y enlace por URL

- [x] Búsqueda por nombre y por código; filtros de proceso («TAL — Taller», agrupados por banda), banda, tipo, empresa y estado; botón «Limpiar filtros»; parámetros de URL `?proceso=` (y banda, tipo, empresa, estado).
- [x] **Ampliación aprobada por el usuario al arrancar la fase (2026-10-13):** nivel de la pirámide documental como filtro y como campo en «Ver más» — 1 Estratégico (CA, PO, MA), 2 Táctico (PR, PG), 3 Operativo (INT, GU, MT), 4 Evidencia (RG, OT); se deduce del tipo (`Catalog.LEVELS`), no es columna del listado. Elegir nivel acota el filtro de tipo; parámetro de URL `?nivel=`.
- [x] Validación: combinaciones de filtros dan el resultado esperado contra los datos demo; `?proceso=TAL` y `?proceso=tal` abren filtrado; una sigla inexistente se ignora con aviso; elegir banda acota el filtro de proceso; empresa incluye TODAS; filtros con etiqueta y operables por teclado; 0 desbordamiento horizontal en los 3 anchos.
  - Resultado (2026-10-13, QA headless servido por HTTP local): 27/27 comprobaciones OK — `?proceso=TAL` y `?proceso=tal` (3 docs), `?proceso=XYZ` ignorado con aviso, URL combinada en formas cortas (`estado=en-revision&empresa=los-autos&nivel=tactico`) y banda con tilde y espacios + `q`; búsqueda por código (`tal-rg`) y por nombre; banda acota procesos y reinicia un proceso fuera de ella; nivel acota tipos (Evidencia → RG, OT; 6 docs; Estratégico 4 docs); combinación Apoyo + Vigente (5); empresa LOS AUTOS incluye TODAS (17); la URL refleja los filtros (`replaceState`) y «Limpiar filtros» la vacía; panel muestra «Táctico (nivel 2)»; los 7 controles con etiqueta, orden de foco correcto y select operable con teclado; 0 desbordamiento en 375/768/1280; 0 errores de consola. Regresión de las Fases 5 y 6: OK.
  - Ajuste visual durante la validación: en 375 px se recortaba el texto «Todas las bandas…»; las opciones «todos» pasan a «Todos»/«Todas» (la etiqueta ya nombra el filtro).
  - Criterio de diseño: el filtro de proceso lista todos los procesos del catálogo (aunque no tengan documentos), para que el enlace desde cualquier tarjeta del mapa funcione; las siglas de los datos que no están en el catálogo van en «Otros».

## Fase 8 — Tabla y panel de detalle

- [x] Tabla con Versión y Empresa; panel con todos los campos por secciones (identificación, vigencia, retención, responsables, control de cambios); fecha límite de revisión marcada si está vencida; anexos y variantes clicables (anexo ↔ principal); botón «Abrir» (pestaña nueva, porque los enlaces de SharePoint no respetan `download`) solo para VIGENTE, con aviso si un vigente no tiene UBICACIÓN.
- [x] Ajuste pedido por el usuario al arrancar la fase (2026-10-13): la etiqueta «Nivel» pasa a «Nivel documental» (filtro y panel).
- [x] Validación: todos los campos visibles («—» si vacío); navegación anexo ↔ principal y entre variantes; fecha vencida distinguible; la regla de estado se respeta en fila, panel y guarda defensiva; foco/Esc como hoy; los 3 estados de tabla siguen funcionando; 0 desbordamiento horizontal.
  - Resultado (2026-10-13, QA headless servido por HTTP local): 30/30 comprobaciones OK — tabla con Versión y Empresa (la variante muestra «Los Autos»); «Abrir» en filas solo para Vigente; panel con 6 secciones y 19 campos visibles con formato (`PR — Procedimiento`, `Táctico (nivel 2)`, `COM — Compras`, fecha larga, «—» si vacío); principal → anexo → principal y entre variantes LOS COCHES ↔ LOS AUTOS; al navegar el foco va al título y Esc devuelve el foco al «Ver más» original; fecha límite vencida con marca «Vencida» y en rojo, la por vencer sin marca; EN REVISIÓN con «Abrir» deshabilitado, aviso en el pie y guarda defensiva que lo bloquea aunque se fuerce el clic; vigente sin UBICACIÓN con aviso en el panel y al abrir; `openURL` abre en pestaña nueva (`_blank`, `noopener`) y en modo demo la apertura se simula; estados cargando / sin datos (carga forzada a fallar) / sin resultados, a 8 columnas; 0 desbordamiento en 375/768/1280 con el panel abierto; 0 errores de consola. Regresión de las Fases 5, 6 y 7: OK.
  - **Ajuste posterior al cierre (2026-10-13), pedido por el usuario:** el botón depende del formato del archivo de UBICACIÓN — PDF → «Abrir» (pestaña nueva); cualquier otra extensión → «Descargar» (`Utils.General.downloadURL`: en SharePoint agrega `?download=1` y quita `?web=1`; aviso «copia no controlada»); sin extensión (enlace de compartir) → «Abrir». Datos demo con casos pdf, xlsx y docx. QA headless 11/11 (etiqueta por extensión en filas y panel, `aria-label`, simulación en demo, extracción de extensión con consulta/fragmento, `?download=1` solo en SharePoint) y regresión de las Fases 5–8 OK. Durante la prueba apareció y se corrigió un fallo propio del ajuste: las ubicaciones demo `#demo/…` perdían la extensión al cortar en `#`.
  - Fuera de la validación, decisiones de diseño: UBICACIÓN no se muestra como texto en el panel (es el destino de «Abrir»); el panel se arma desde una definición de secciones en `main.js` (`_renderDetailBody`) y cada valor conserva el id `detalle-<propiedad>`.

## Fase 9 — QA y accesibilidad

- [x] Revisión completa en los 3 anchos: contraste, orden de foco, textos para lectores de pantalla, y comprobación de que el repositorio público no contiene datos reales.
- [x] Validación: checklist registrado en `07`; búsqueda en el repositorio de códigos y nombres del listado real ausentes de los datos demo → 0 coincidencias.
  - Auditoría inicial (2026-10-13): 7 fallos — contraste insuficiente (badges Vigente 3,70:1, En revisión 2,75:1, Obsoleto 4,32:1; textos grises de etiquetas del panel, código, pie, mensaje sin resultados y aviso ~3:1; placeholder 2,00:1), sin `h1`, y con el panel abierto el foco salía al fondo (sin fondo inerte).
  - Correcciones: tokens de texto accesibles en `:root` (`--color-texto-suave` #5F6878, `--color-exito-texto` #1F7044, `--color-error-texto` #A62B3D, `--color-advertencia-texto` #8A5300; mismo tono, los tokens de borde e ícono no cambian); título del sistema como `h1`; fondo `inert` y foco atrapado en el panel (Tab / Shift+Tab); además, botones de acción de la fila en una sola línea (columna de 200 px).
  - Resultado (QA headless servido por HTTP local): 23/23 — contraste AA (≥ 4,5:1 texto normal) en vista principal, sin resultados, panel EN REVISIÓN con «Vencida» y aviso, y avisos (toasts); `lang="es"`, un único `h1`, regiones header/main/footer, botones con nombre, imágenes con `alt`, controles con etiqueta, `scope="col"` en la tabla, contador y avisos con `aria-live`, panel `role="dialog"` + `aria-modal` + título; foco visible en cada parada del teclado; foco atrapado en el panel y fondo inerte (y operable al cerrar); 320 px sin desbordamiento y logo visible de 186 px; texto al 200 % sin recortes; `prefers-reduced-motion` sin transición; 0 errores de consola. Regresión de las Fases 5, 6, 7, 8 y ajuste de la 8: OK.
  - Datos reales (búsqueda local contra 997 códigos y 1010 nombres del listado, en todos los archivos de todos los commits; los valores encontrados no se citan aquí para no volver a publicarlos): en los archivos actuales aparecían 3 códigos reales (los del propio listado y del procedimiento de control documental, en comentarios y docs, y un código tomado de un ejemplo de la propuesta en un comentario de `utils.js` durante el ajuste de la Fase 8) y 2 frases genéricas que también forman parte de nombres reales (un dato demo y un comentario). Todo se reemplazó por texto genérico o inventado → **0 coincidencias en el commit de esta fase**. Seguían presentes en los commits locales de las Fases 5 a 9 (aún no publicados): con aprobación del usuario (2026-10-13, opción A) se reescribió ese historial local con `git filter-branch` aplicando los mismos reemplazos — se conserva un commit por fase y el árbol final no cambia. Búsqueda posterior sobre toda la rama: 0 códigos reales; queda solo una frase genérica de los datos demo originales en el primer commit (ya público) y en los de las Fases 4 y 5, aceptada por el usuario.

## Fase 10 — Integración real con Power Automate (antes Fase 5)

- Reemplazar el modo demo por el flujo real que consulta el Excel en SharePoint.
- Validación mínima: datos reales cargan correctamente end-to-end (búsqueda, filtro y descarga).
- Validar con un enlace real de cada formato (PDF, xlsx, docx) del sitio de SharePoint de Calidad: el PDF se abre en el navegador y los editables se descargan con `?download=1` (depende de la configuración del sitio; no verificable con datos demo). Recomendación para el listado: UBICACIÓN con el enlace directo al archivo (con extensión), no el enlace de compartir.

## Fase 11 — Cierre (antes Fase 6)

- QA final y revisión de accesibilidad.
- Ciclo de aprendizaje (lecciones aprendidas) — ver [[IDENTIDAD|IDENTIDAD.md]] §4.
- Propuesta de actualización de [[Inventarios/INVENTARIO_Web|INVENTARIO_Web.md]] temático (Formularios_Web), con aprobación explícita antes de escribir.
