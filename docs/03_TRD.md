# TRD — Consulta_Documental

> Contratos técnicos entre la consulta (navegador) y los flujos de Power Automate. Creado en la Fase 11 (2026-10-13).
> Stack: HTML + CSS + JS vainilla, sin dependencias. Configuración de despliegue en `config.js` (ver [[Entregables/Web/Consulta_Documental/docs/00_README|00_README.md]] § Despliegue).

## Restricciones

- El repositorio es público: ninguna URL de flujo, dato real ni dominio de la empresa va al código. La configuración real la escribe `tools/build_deploy.py` en `dist/`: `config.js` (F1, ambas páginas) y `config-cargue.js` (F2, solo `cargue.html`).
- La consulta se publica solo en un destino interno. La página y los flujos están en dominios distintos: **F1 y F2 deben aceptar CORS** (verificación previa `OPTIONS`, `Access-Control-Allow-Origin`).
- Los disparadores HTTP (F1, F2) no autentican a quien llama. La seguridad del cargue depende de la aprobación de Sistemas de Gestión en F3 (con cuenta de la empresa) y de las validaciones de F2.
- Formatos de fecha: ISO 8601 (`YYYY-MM-DD`; `requestedAt` con hora en UTC). La consulta también acepta `DD/MM/YYYY` y el número de serie de Excel en F1.

## F1 — Leer listado

| | |
|---|---|
| Disparador | «Cuando se recibe una solicitud HTTP», método POST |
| Pide la consulta | `POST URL_DOCUMENTS` con cuerpo `{}` y `Content-Type: application/json` |
| Responde | `200` con `{ "value": [ fila, … ] }` (también se acepta un arreglo directo o `{ "body": [...] }`) |
| Fila | Objeto con los 22 encabezados del listado maestro tal como están en la tabla de Excel (`CÓDIGO`, `NOMBRE DEL DOCUMENTO`, `TIPO`, `PROCESO (SIGLA)`, `BANDA DEL MAPA`, `VERSIÓN`, `FECHA DE VIGENCIA`, `ESTADO`, `FECHA LÍMITE DE REVISIÓN`, `EMPRESA`, `DOCUMENTO PRINCIPAL`, `UBICACIÓN`, `RETENCIÓN ARCHIVO DE GESTIÓN (AÑOS)`, `RETENCIÓN ARCHIVO CENTRAL (AÑOS)`, `DISPOSICIÓN FINAL`, `FUNDAMENTO DE LA RETENCIÓN`, `CARGO QUE ELABORA`, `CARGO QUE APRUEBA`, `CONTROL DE CAMBIOS`, `OBSERVACIONES`, `CLASIFICACIÓN`, `EMISOR` — las dos últimas desde la Fase 12; si faltan, CLASIFICACIÓN se toma como INTERNA). Mapeo a propiedades internas: `Utils.Json.COLUMNS` |
| Reservados | En las filas con `CLASIFICACIÓN` = `RESERVADA`, F1 **envía `UBICACIÓN` vacía** (acción «Seleccionar» con `if(equals(CLASIFICACIÓN,'RESERVADA'),'',UBICACIÓN)`): la consulta ya no muestra el enlace, pero sin esto quedaría en la respuesta del flujo. La protección real son los permisos del archivo en SharePoint (Fase 12) |
| Requisitos | Excel formateado como tabla, llamada `ListadoMaestro` (la generan `plantilla_listado.py`, en blanco, y `migrar_listado.py`, con el listado actual, en la carpeta local `auditoria/` del proyecto Mapa_de_procesos, fuera de Git); paginación activada en «Enumerar filas presentes en una tabla» (umbral ≥ 5000, el listado supera las 256 filas por defecto) |
| Error | Cualquier respuesta no `2xx` o JSON inválido → la consulta muestra «sin datos» y un aviso |

## F2 — Recibir solicitud de cargue

**Disparador:** «Cuando se recibe una solicitud HTTP», método POST, `Content-Type: application/json`. Lo llama la página independiente de cargue (`cargue.html`) con `POST URL_UPLOAD`; esa URL está en `config-cargue.js`, que la consulta no carga.

**Cuerpo** (lo arma `Upload.buildPayload()` en `upload.js`):

```json
{
  "requestType": "NEW | NEW_VERSION | ANNEX | VARIANT | RETIRE",
  "requestedAt": "2026-10-13T15:04:05.000Z",
  "reviewDeadline": "2026-10-28",
  "document": {
    "code": "",
    "proposedCode": "TAL-RG-092",
    "parentCode": "",
    "name": "Nombre del documento",
    "type": "RG",
    "process": "TAL",
    "band": "MISIONALES",
    "company": "TODAS",
    "currentVersion": ""
  },
  "retention": { "managementYears": 2, "centralYears": 8, "finalDisposition": "SELECCIÓN", "basis": "" },
  "change": { "description": "", "preparedBy": "", "approvedBy": "", "notes": "" },
  "requester": { "name": "", "email": "nombre@empresa.com" },
  "file": { "name": "archivo.xlsx", "extension": "xlsx", "sizeBytes": 12345, "contentType": "…", "contentBase64": "…" }
}
```

| Campo | Regla por tipo de solicitud |
|---|---|
| `document.code` | `NEW_VERSION`, `VARIANT` y `RETIRE`: código existente. `NEW` y `ANNEX`: vacío (lo asigna F3) |
| `document.proposedCode` | Vista previa calculada en el navegador: `NEW` → siguiente consecutivo de SIGLA-TIPO; `ANNEX` → principal + siguiente `-ANnn`; los demás → el código existente. **Informativo: F3 recalcula al aprobar** |
| `document.parentCode` | Solo `ANNEX`: código del documento principal |
| `document.company` | `NEW`: elegida (por defecto TODAS). `VARIANT`: una empresa que el documento aún no tiene. `NEW_VERSION`, `ANNEX` y `RETIRE`: la del documento existente (la solicitud aplica solo a esa fila: cada variante por empresa va en su propia solicitud) |
| `document.currentVersion` | `NEW_VERSION`, `VARIANT` y `RETIRE`: versión vigente del documento existente |
| `reviewDeadline` | Solo `NEW_VERSION`: fecha de la solicitud + `REVIEW_DAYS` (15 días calendario). Vacío en los demás |
| `retention.*` | Solo si `document.type` es `RG` y no es `RETIRE` (años enteros 0–100 y disposición obligatorios); si no, `null` / vacío |
| `change.description` | Obligatoria: motivo de creación (`NEW`), descripción del cambio, o motivo del retiro (`RETIRE`) |
| `change.preparedBy` / `approvedBy` | Obligatorios salvo en `RETIRE` (vacíos) |
| `change.notes` | Notas del líder para Sistemas de Gestión: van a la solicitud y a la aprobación, **nunca a la columna OBSERVACIONES del listado** |
| `requester.email` | En minúsculas |
| `file` | `null` en `RETIRE` (el retiro no lleva archivo) |
| `file.contentBase64` | Contenido del archivo en base64, sin el prefijo `data:` |

**Validaciones de F2 (servidor; el navegador ya valida lo mismo, pero F2 no debe confiar en él):** `requestType` válido; campos obligatorios; salvo en `RETIRE`, `file.extension` ∈ {pdf, docx, xlsx, pptx} y `file.sizeBytes` ≤ 20 MB; dominio de `requester.email` permitido; para `NEW_VERSION`, `VARIANT`, `ANNEX` y `RETIRE`, que el código existente esté en el listado y no esté OBSOLETO ni ELIMINADO.

**Acciones:** guardar el archivo en `_Pendientes` (no público) con el número de solicitud en el nombre (salvo `RETIRE`, que no lleva archivo); crear el elemento en la lista de SharePoint «Solicitudes de cargue» (estado PENDIENTE, con todos los campos del cuerpo salvo el contenido del archivo y la ruta del archivo guardado); si es `NEW_VERSION`, poner el documento EN REVISIÓN con `FECHA LÍMITE DE REVISIÓN` = `reviewDeadline`.

**Respuesta:** `200` con `{ "requestId": "SOL-2026-0001", "status": "PENDIENTE" }`. Con datos inválidos: `400` con `{ "error": "mensaje para el usuario" }`. La consulta muestra el `requestId`; si no llega, trata la respuesta como error.

## F3 — Aprobar y publicar

**Disparador:** «Cuando se crea un elemento» en la lista «Solicitudes de cargue». **Control de simultaneidad del disparador = 1** (procesa de a una solicitud, sin consecutivos duplicados).

1. Aprobación («Iniciar y esperar una aprobación») asignada a Sistemas de Gestión, con el resumen de la solicitud y el enlace al archivo en `_Pendientes`.
2. **Rechazada:** estado RECHAZADA en la lista, archivo a `_Rechazados`, aviso al solicitante con los comentarios; si era `NEW_VERSION`, el documento vuelve a VIGENTE sin fecha límite.
3. **Aprobada** — código y versión definitivos (el código se recalcula; nunca se reutiliza un consecutivo; se cuentan todos los estados):
   - `NEW`: siguiente consecutivo libre de `SIGLA-TIPO-NNN`, **versión 1**.
   - `ANNEX`: `CÓDIGO_PRINCIPAL-ANnn` con el siguiente `nn` libre, **versión 1** (los anexos tienen su propio control de versiones; decisión 2026-10-13).
   - `NEW_VERSION`: mismo código, versión = `currentVersion` + 1. Si el código tiene variantes por empresa, solo cambia la fila de la empresa de la solicitud; cada variante se actualiza con su propia solicitud (SG cuida que queden en la misma versión).
   - `VARIANT`: mismo código y versión, con la empresa de la solicitud (si el documento estaba con EMPRESA = TODAS, SG ajusta ese registro).
   - `RETIRE`: sin código nuevo.
4. Archivo (salvo `RETIRE`): renombrar «CÓDIGO Nombre Vn.ext» (variante: « - EMPRESA» al final) y moverlo a la carpeta del proceso (banda / grupo / «SIGLA - Nombre»).
5. `NEW_VERSION`: mover la versión anterior a `_Obsoletos` del proceso. `RETIRE`: mover el archivo vigente a `_Obsoletos`; los anexos vigentes del documento los decide SG en la misma aprobación.
6. Listado — FECHA DE VIGENCIA = fecha de aprobación en todos los casos que publican; UBICACIÓN = enlace directo al archivo (con extensión; si el formato existe en PDF y en editable, al editable, que es el que se diligencia; el PDF queda en la misma carpeta); CONTROL DE CAMBIOS = `AAAA-MM-DD · vN → vN+1 · descripción` (en `NEW` y `ANNEX`: `AAAA-MM-DD · v1 · Creación: motivo`; en `VARIANT`: `AAAA-MM-DD · Variante EMPRESA · descripción`); OBSERVACIONES no se toca:
   - `NEW` y `ANNEX`: agregar fila VIGENTE con todas las columnas de la solicitud (BANDA según el proceso; DOCUMENTO PRINCIPAL en `ANNEX`).
   - `VARIANT`: agregar fila copiando las columnas de la fila base y cambiando EMPRESA, UBICACIÓN, FECHA DE VIGENCIA y CONTROL DE CAMBIOS.
   - `NEW_VERSION`: actualizar la fila (código + empresa): VERSIÓN, FECHA DE VIGENCIA, ESTADO = VIGENTE, FECHA LÍMITE vacía, UBICACIÓN, CONTROL DE CAMBIOS y, si el líder los cambió, NOMBRE, CARGO QUE ELABORA, CARGO QUE APRUEBA y la retención.
   - `RETIRE`: ESTADO = ELIMINADO, FECHA LÍMITE vacía, CONTROL DE CAMBIOS = `AAAA-MM-DD · Retiro · motivo`; UBICACIÓN pasa al archivo en `_Obsoletos`.
7. Estado APROBADA en la lista con el código definitivo; aviso al solicitante.
