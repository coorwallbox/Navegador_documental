/* ================================================================
   CONSULTA DOCUMENTAL
   auth.js · Fase 13 · 2026
   Inicio de sesión con la cuenta de la empresa (Microsoft Entra ID)
   para la página de cargue (objeto global Auth). El solicitante sale
   de la cuenta y el token viaja al flujo F2, cuyo disparador solo
   acepta usuarios del inquilino (contrato en docs/03_TRD.md).
   Usa MSAL.js v5 (vendor/msal, servido desde el mismo origen) y la
   página puente auth-redirect.html, que MSAL v5 exige para el popup.
   Sin AUTH_CLIENT_ID configurado (repositorio), simula un usuario
   de prueba (modo demo).
   Depende de: config-cargue.js y vendor/msal/msal-browser-*.min.js
================================================================ */

const Auth = (() => {

  'use strict';

  const DEPLOY = (typeof UPLOAD_CONFIG !== 'undefined') ? UPLOAD_CONFIG : {};

  const CONFIG = {
    CLIENT_ID: DEPLOY.AUTH_CLIENT_ID || '',
    TENANT_ID: DEPLOY.AUTH_TENANT_ID || '',
    // Permiso del token para el disparador de Power Automate restringido al inquilino (se confirma en la Fase 15)
    SCOPE:     DEPLOY.AUTH_SCOPE || 'https://service.flow.microsoft.com//.default',
  };

  /** Usuario simulado del modo demo (inventado). */
  const DEMO_USER = Object.freeze({ name: 'Usuario de prueba', email: 'usuario.prueba@empresa.demo' });

  const state = {
    client: null,    // PublicClientApplication de MSAL
    account: null,   // cuenta de MSAL (o DEMO_USER en modo demo)
  };

  /** true si no hay aplicación de Entra ID configurada. */
  function isDemo() {
    return !CONFIG.CLIENT_ID;
  }

  /**
   * Prepara MSAL y recupera la sesión que ya exista en la pestaña.
   * En modo demo no hace nada (se inicia sesión con el botón).
   * @returns {Promise<{name: string, email: string}|null>} usuario con sesión o null
   */
  async function init() {
    if (isDemo()) return null;
    if (typeof msal === 'undefined') throw new Error('No se cargó MSAL (vendor/msal).');
    const redirectUri = new URL('auth-redirect.html', window.location.href).href;
    state.client = new msal.PublicClientApplication({
      auth: {
        clientId: CONFIG.CLIENT_ID,
        authority: `https://login.microsoftonline.com/${CONFIG.TENANT_ID}`,
        redirectUri,
        postLogoutRedirectUri: redirectUri,
      },
      // La sesión dura lo que la pestaña: en un equipo compartido no queda abierta
      cache: { cacheLocation: 'sessionStorage' },
    });
    await state.client.initialize();
    await state.client.handleRedirectPromise();
    state.account = state.client.getAllAccounts()[0] || null;
    return user();
  }

  /** Abre la ventana de inicio de sesión de Microsoft. @returns {Promise<{name, email}>} */
  async function signIn() {
    if (isDemo()) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      state.account = DEMO_USER;
      return user();
    }
    const result = await state.client.loginPopup({ scopes: [CONFIG.SCOPE], prompt: 'select_account' });
    state.account = result.account;
    return user();
  }

  /** Cierra la sesión (también en Microsoft, en la ventana emergente). */
  async function signOut() {
    const account = state.account;
    state.account = null;
    if (!isDemo() && account) await state.client.logoutPopup({ account });
  }

  /** Usuario con sesión ({ name, email } con el correo en minúsculas) o null. */
  function user() {
    const account = state.account;
    if (!account) return null;
    if (isDemo()) return { ...DEMO_USER };
    return { name: account.name || account.username, email: String(account.username || '').toLowerCase() };
  }

  /**
   * Token de acceso para el flujo F2: primero en silencio y, si Entra ID
   * pide interacción (sesión vencida, consentimiento), con la ventana emergente.
   * @returns {Promise<string>}
   */
  async function getToken() {
    if (!state.account) throw new Error('No hay sesión iniciada.');
    if (isDemo()) return 'token-demo';
    const request = { scopes: [CONFIG.SCOPE], account: state.account };
    try {
      return (await state.client.acquireTokenSilent(request)).accessToken;
    } catch (error) {
      if (!(error instanceof msal.InteractionRequiredAuthError)) throw error;
      return (await state.client.acquireTokenPopup(request)).accessToken;
    }
  }

  return { isDemo, init, signIn, signOut, user, getToken };

})();
