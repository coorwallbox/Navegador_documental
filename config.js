/* ================================================================
   CONSULTA DOCUMENTAL
   config.js · Fase 10 · 2026
   Configuración de despliegue. EN EL REPOSITORIO VA SIEMPRE CON LAS
   URL VACÍAS (modo demo): el repositorio es público y la URL de un
   flujo con disparador HTTP permite usarlo a quien la tenga.
   Los valores reales los escribe tools/build_deploy.py en la carpeta
   de publicación (dist/) a partir de config.local.json, que está
   excluido de Git. No editar este archivo con URL reales.
   Se carga antes que el resto de los scripts.
================================================================ */

const APP_CONFIG = Object.freeze({
  // F1 — leer el listado maestro (vacía = modo demo)
  URL_DOCUMENTS: '',
  // F2 — recibir solicitudes de cargue (Fase 11 en adelante)
  URL_UPLOAD: '',
  // Días calendario de la fecha límite de una solicitud de nueva versión
  REVIEW_DAYS: 15,
  // Tamaño máximo del archivo a cargar (MB)
  MAX_UPLOAD_MB: 20,
});
