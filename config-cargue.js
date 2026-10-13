/* ================================================================
   CONSULTA DOCUMENTAL
   config-cargue.js · Fase 11 (ajuste) · 2026
   Configuración de la página de cargue (cargue.html). Solo la carga
   esa página, para que la URL del flujo F2 no quede expuesta en la
   consulta. EN EL REPOSITORIO VA SIEMPRE CON LA URL VACÍA (modo demo);
   los valores reales los escribe tools/build_deploy.py en dist/.
================================================================ */

const UPLOAD_CONFIG = Object.freeze({
  // F2 — recibir solicitudes de cargue (vacía = envío simulado)
  URL_UPLOAD: '',
  // Días calendario de la fecha límite de una solicitud de nueva versión
  REVIEW_DAYS: 15,
  // Tamaño máximo del archivo a cargar (MB)
  MAX_UPLOAD_MB: 20,
  // Dominios de correo aceptados (vacío = sin restricción en el navegador; F2 valida igual)
  ALLOWED_EMAIL_DOMAINS: [],
});
