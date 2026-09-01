# Consulta_Documental — README

> Carpeta temática: `Formularios_Web/`.
> Última revisión: 2026-09-01.

## Propósito

Formulario web de búsqueda documental que permite consultar documentos mediante palabra clave (por nombre del documento) y un filtro obligatorio por proceso, presentando los resultados en una tabla organizada con panel de detalle y descarga del documento original.

## Contexto

Referencia de arquitectura: `Cotizaciones_Wallbox` (mismo tema `Formularios_Web`) — patrón `App`/`Utils`, estado centralizado, modo demo, integración con Excel en SharePoint vía Power Automate. El código original de esa referencia no se modifica; esta es una solución nueva en carpeta propia.

## Origen de datos

Excel almacenado en SharePoint, consultado a través de un flujo de Power Automate. Columnas:

| Columna Excel | Propiedad interna |
|---|---|
| Código | `code` |
| Nombre del documento | `documentName` |
| Tipo | `type` |
| Proceso | `process` |
| Versión | `version` |
| Fecha de emisión | `issueDate` |
| Fecha de aprobación | `approvalDate` |
| Responsable | `owner` |
| Estado | `status` |
| Ubicación | `location` |
| Usuarios o áreas aplicables | `applicableAreas` |
| Tiempo de retención | `retentionTime` |

## Estructura de archivos (prevista)

```
Consulta_Documental/
├── docs/
│   ├── 00_README.md
│   ├── 01_INDEX.md
│   ├── 06_IMPLEMENTATION.md
│   └── 07_PROGRESO_RESUMEN.md
├── index.html
├── main.js
├── styles.css
└── utils.js
```

**Orden de carga obligatorio en `index.html`:** `utils.js` antes que `main.js` (patrón heredado de Wallbox: `App` depende de `Utils`).

## Funcionalidades principales (previstas)

- Filtro opcional por Proceso (`process`, dropdown) — complementa la búsqueda por palabra clave, no es requisito para buscar.
- Búsqueda por palabra clave sobre `documentName` (Nombre del documento).
- Tabla de resultados resumen: Código, Nombre del documento, Tipo, Proceso, Estado, Descargar.
- Botón "Ver más" por fila → panel de detalle deslizante (overlay + aside) con el resto de columnas: Versión, Fecha de emisión, Fecha de aprobación, Responsable, Usuarios/áreas aplicables, Tiempo de retención.
- Botón "Descargar" por fila → abre/descarga el archivo desde `location` (enlace/ruta SharePoint).
- Modo demo (datos de ejemplo embebidos) para desarrollar sin depender de Power Automate.
- Acceso libre, sin selección de actor/rol.

## Patrones reutilizados de Cotizaciones_Wallbox

- Revealing module pattern + IIFE (`App` / `Utils`).
- Estado centralizado y `Utils.Json` para normalizar/mapear respuestas de Power Automate (columnas Excel → propiedades internas).
- `Utils.Loader` (overlay de carga), `Utils.Mensaje` (toasts), `Utils.Animar` (micro-interacciones).
- Debounce en el campo de búsqueda.
- Estados de tabla: sin datos / cargando / sin resultados.
- Design tokens CSS (variables de color, tipografía, espaciado) y estructura de `styles.css` por secciones.

## Diferencias frente a la referencia

- Filtro opcional (`process`) reemplaza al selector de actor/instalador de Wallbox.
- Panel de detalle deslizante (overlay + aside) es un componente nuevo — Wallbox solo tiene un modal de confirmación.
- No genera un documento nuevo: permite descargar un documento ya existente en SharePoint.
- Sin selección de actor: acceso libre.

## Lecciones aprendidas

_(pendiente — se completa al cerrar el ciclo de aprendizaje del proyecto, con supervisión)_

## Documentación relacionada

Ver `01_INDEX.md` para el mapa completo de la carpeta `docs/`.
