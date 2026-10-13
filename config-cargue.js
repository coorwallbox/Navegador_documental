/* ================================================================
   CONSULTA DOCUMENTAL
   config-cargue.js · Fase 11 (ajuste) · 2026 (inicio de sesión: Fase 13)
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
  // Microsoft Entra ID: aplicación registrada para la página de cargue (vacía = usuario simulado, modo demo)
  AUTH_CLIENT_ID: '',
  AUTH_TENANT_ID: '',
  // Permiso del token para el disparador de F2 restringido al inquilino (vacío = el de Power Automate)
  AUTH_SCOPE: '',
});
