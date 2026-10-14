# TRD — Consulta_Documental

> Contratos técnicos entre la consulta (navegador) y los flujos de Power Automate. Creado en la Fase 11 (2026-10-13).
> Stack: HTML + CSS + JS vainilla, sin dependencias. Configuración de despliegue en `config.js` (ver [[Entregables/Web/Consulta_Documental/docs/00_README|00_README.md]] § Despliegue).

## Restricciones

- El repositorio es público: ninguna URL de flujo, dato real ni dominio de la empresa va al código. La configuración real la escribe `tools/build_deploy.py` en `dist/`: `config.js` (F1, ambas páginas) y `config-cargue.js` (F2, solo `cargue.html`).
- La consulta se publica solo en un destino interno. La página y los flujos están en dominios distintos: **F1 y F2 deben aceptar CORS** (verificación previa `OPTIONS`, `Access-Control-Allow-Origin`).
- F1 no autentica a quien llama (solo lee el listado; la consulta se publica en un destino interno y no recibe la UBICACIÓN de los reservados). **F2 sí, desde la Fase 13:** su disparador se configura con «Quién puede desencadenar el flujo» = **cualquier usuario de mi inquilino**, y la página de cargue envía el token de la cuenta de la empresa (Microsoft Entra ID, MSAL.js). Además, nada se publica sin las dos aprobaciones de F3.
- **Inicio de sesión (Fase 13):** aplicación registrada en Entra ID como *aplicación de página única (SPA)*, con URI de redirección = la URL publicada de `auth-redirect.html` (también como URI de cierre de sesión) y permiso delegado sobre Power Automate para pedir el token (`AUTH_SCOPE`; por defecto `https://service.flow.microsoft.com//.default`, que se confirma en la Fase 15). `AUTH_CLIENT_ID` y `AUTH_TENANT_ID` van en `config.local.json`; `build_deploy.py` los exige si hay `URL_UPLOAD`. La sesión se guarda en `sessionStorage` (se cierra con la pestaña).
- **Página puente `auth-redirect.html`:** MSAL v5 la necesita para devolver la respuesta de Entra ID desde la ventana emergente. Se sirve desde el **mismo origen** que `cargue.html`, **sin** encabezado `Cross-Origin-Opener-Policy` y sin caché (`Cache-Control: no-store` en el servidor; el `<meta>` de la página es solo un respaldo). MSAL se publica copiado en `vendor/msal/` (v5.23.0, licencia MIT), nunca desde un CDN de terceros.
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

**Disparador:** «Cuando se recibe una solicitud HTTP», método POST, `Content-Type: application/json`, **restringido a los usuarios del inquilino** (Fase 13). Lo llama la página independiente de cargue (`cargue.html`) con `POST URL_UPLOAD` y el encabezado `Authorization: Bearer <token>` de la cuenta con sesión; esa URL está en `config-cargue.js`, que la consulta no carga. Sin token válido del inquilino, Power Automate rechaza la llamada antes de ejecutar el flujo.

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
    "classification": "INTERNA | RESERVADA",
    "issuer": "",
    "currentVersion": ""
  },
  "retention": { "managementYears": 2, "centralYears": 8, "finalDisposition": "SELECCIÓN", "basis": "" },
  "change": { "description": "", "preparedBy": "", "approvedBy": "", "contentApproverEmail": "aprobador@empresa.com", "notes": "" },
  "requester": { "name": "", "email": "nombre@empresa.com", "privacyNoticeAccepted": true },
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
| `document.classification` | INTERNA o RESERVADA, elegida por el líder (en `RETIRE`, la del documento). Va a la columna CLASIFICACIÓN (Fase 13) |
| `document.issuer` | Solo tipo `DE` (documento externo): emisor, obligatorio. Vacío en los demás. Va a la columna EMISOR |
| `change.preparedBy` / `approvedBy` | Obligatorios salvo en `RETIRE` y en los documentos externos (`DE`), que van vacíos |
| `change.contentApproverEmail` | Obligatorio salvo en `RETIRE` (vacío): correo de quien aprueba el contenido; recibe la **primera aprobación** de F3 (Fase 13) |
| `change.notes` | Notas del líder para Sistemas de Gestión: van a la solicitud y a la aprobación, **nunca a la columna OBSERVACIONES del listado** |
| `requester.name` / `email` | Salen de la cuenta con sesión (no se escriben); correo en minúsculas. **F2 no debe confiar en ellos:** toma la identidad del token (las notificaciones del usuario que Power Automate expone en el disparador) y rechaza la solicitud si el correo del cuerpo no coincide (se confirma cómo leerla en la Fase 15) |
| `requester.privacyNoticeAccepted` | `true` obligatorio: el solicitante leyó el aviso de privacidad del formulario (Ley 1581/2012). Se guarda en la solicitud con `requestedAt` |
| `file` | `null` en `RETIRE` (el retiro no lleva archivo) |
| `file.contentBase64` | Contenido del archivo en base64, sin el prefijo `data:` |

**Validaciones de F2 (servidor; el navegador ya valida lo mismo, pero F2 no debe confiar en él):** token del inquilino (lo valida el disparador); identidad del token = `requester.email`; `privacyNoticeAccepted` = `true`; `contentApproverEmail` con dominio permitido salvo en `RETIRE`; `requestType` válido; campos obligatorios; salvo en `RETIRE`, `file.extension` ∈ {pdf, docx, xlsx, pptx} y `file.sizeBytes` ≤ 20 MB; dominio de `requester.email` permitido; para `NEW_VERSION`, `VARIANT`, `ANNEX` y `RETIRE`, que el código existente esté en el listado y no esté OBSOLETO ni ELIMINADO.

**Acciones:** guardar el archivo en `_Pendientes` (no público) con el número de solicitud en el nombre (salvo `RETIRE`, que no lleva archivo); crear el elemento en la lista de SharePoint «Solicitudes de cargue» (estado PENDIENTE, con todos los campos del cuerpo salvo el contenido del archivo y la ruta del archivo guardado); si es `NEW_VERSION`, poner el documento EN REVISIÓN con `FECHA LÍMITE DE REVISIÓN` = `reviewDeadline`.

**Respuesta:** `200` con `{ "requestId": "SOL-2026-0001", "status": "PENDIENTE" }`. Con datos inválidos: `400` con `{ "error": "mensaje para el usuario" }`. La consulta muestra el `requestId`; si no llega, trata la respuesta como error.

## F3 — Aprobar y publicar

**Disparador:** «Cuando se crea un elemento» en la lista «Solicitudes de cargue». **Control de simultaneidad del disparador = 1** (procesa de a una solicitud, sin consecutivos duplicados).

1. **Dos aprobaciones en secuencia (Fase 13)**, ambas con «Iniciar y esperar una aprobación», el resumen de la solicitud y el enlace al archivo en `_Pendientes`:
   1. **Contenido:** asignada a `change.contentApproverEmail` (en `RETIRE` se omite). Si la rechaza, se sigue el paso 2 (rechazo) sin pasar a SG.
   2. **Publicación:** asignada a Sistemas de Gestión.
   Las dos respuestas (quién, cuándo, resultado y comentarios) se guardan en el elemento de la lista «Solicitudes de cargue» y en el historial de Aprobaciones: son la evidencia de la aprobación electrónica (Ley 527/1999). La lista y su historial se conservan como registro del control de cambios.
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
8. **Aviso al proceso (Fase 13):** correo a los usuarios del proceso con el código, el nombre, la versión, el tipo de cambio y el enlace a la consulta filtrada (`?proceso=SIGLA`). Los destinatarios salen de una lista de SharePoint «Destinatarios por proceso» (SIGLA → correo o grupo), mantenida por SG; **no van en el código** porque el repositorio es público. Si un proceso no tiene destinatarios, se avisa solo a SG.

## Hallazgos del entorno de prueba (2026-10-13)

Se construyeron F1 y F3 en un entorno de prueba de Power Automate (sitio de SharePoint de prueba, listado inventado de 22 filas). No es el entorno definitivo y no reemplaza la validación de las Fases 14 y 15.

- **Licencia:** «Cuando se recibe una solicitud HTTP» y «Respuesta» son **Premium**, y el inquilino de prueba no la tiene. F1 se guarda, pero no se activa. **F1 y F2 necesitan Premium** (va en la lista para TI). F3 solo usa conectores estándar: SharePoint, Aprobaciones, Outlook y Excel Online.
- **F1, copia con disparador manual:** se ejecutó bien. Leyó las 22 filas con paginación, dejó vacía la UBICACIÓN de la fila RESERVADA y pasó de 20 a 19 ubicaciones. La lógica del contrato funciona; falta probar la parte HTTP y CORS con Premium.
- **Método del disparador HTTP:** en la prueba se dejó **vacío** (acepta cualquier método) para que la verificación previa `OPTIONS` de CORS llegue al flujo. Esto se aparta del «método POST» del contrato. Se confirma en la Fase 14 con la llamada real, y entonces se ajusta este TRD.
- **F3 de punta a punta, caso `NEW`:** una solicitud de prueba disparó el flujo. Pasó por las dos aprobaciones (contenido y SG) y obtuvo el siguiente consecutivo libre en versión 1. El archivo pasó de `_Pendientes` a `Procesos/<SIGLA>/` con el nombre «CÓDIGO Nombre V1.ext». Se agregó la fila en el listado, la solicitud quedó APROBADA con las dos respuestas guardadas (resultado · quién · cuándo · comentarios) y salió el aviso. Ejecución correcta en unos 7 minutos (casi todo es la espera de las aprobaciones).
- **Diseño de F3 probado:**
  - Ámbito «Aprobar y publicar» con variables para el resultado y las respuestas.
  - Condición para cada aprobación.
  - «Switch» por `TipoSolicitud`: en la prueba solo `NEW`; el resto queda como «fuera del alcance».
  - Consecutivo: «Enumerar filas» (paginación 5000) → «Filtrar matriz» (empieza por `SIGLA-TIPO-` y tiene 3 partes) → «Seleccionar» `int(last(split(código,'-')))` → `formatNumber(max + 1, '000')`, o `001` si no hay ninguno.
  - La carpeta y el movimiento se hacen con «Enviar una solicitud HTTP a SharePoint» (`folders/add` y `moveto` con `flags=1`).
  - El camino de rechazo está construido, pero falta probarlo.
- **Lista de solicitudes:** las columnas de prueba son `TipoSolicitud`, `Proceso`, `TipoDocumento`, `NombreDocumento`, `Empresa`, `Clasificacion`, `Descripcion`, `CargoElabora`, `CargoAprueba`, `AprobadorContenido`, `SolicitanteEmail`, `RutaArchivo`, `Extension`, `Estado`, `CodigoAsignado`, `RespuestaContenido` y `RespuestaSG`. Carpetas: `_Pendientes`, `_Rechazados`, `_Obsoletos` y `Procesos/<SIGLA>`.
- **Diseñador nuevo de Power Automate:**
  - El editor de expresiones rechaza `?[` al escribirlo. Hay que escribir `[` y el editor lo normaliza solo.
  - En este inquilino no hay opción de pegar una acción copiada. Los ámbitos grandes se insertaron editando la definición del flujo con la API del entorno (PATCH de `definition` y `connectionReferences`), con la sesión del propio portal.
