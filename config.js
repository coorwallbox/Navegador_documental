/* ================================================================
   CONSULTA DOCUMENTAL
   config.js · Fase 10 · 2026
   Configuración de despliegue. EN EL REPOSITORIO VA SIEMPRE CON LAS
   URL VACÍAS (modo demo): el repositorio es público y la URL de un
   flujo con disparador HTTP permite usarlo a quien la tenga.
   Los valores reales los escribe tools/build_deploy.py en la carpeta
   de publicación (dist/) a partir de config.local.json, que está
   excluido de Git. No editar este archivo con URL reales.
   La configuración del cargue (URL de F2) va aparte, en config-cargue.js,
   que solo carga cargue.html: quien abre la consulta no la ve.
   Se carga antes que el resto de los scripts.
================================================================ */

const APP_CONFIG = Object.freeze({
  // F1 — leer el listado maestro (vacía = modo demo). La usan la consulta y la página de cargue.
  URL_DOCUMENTS: '',
});
