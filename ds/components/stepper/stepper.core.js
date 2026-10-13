/**
 * Copia adaptada de Design_System_Core (Regla 3) para Consulta_Documental:
 * único cambio, el método público reset() de <ds-stepper> (el formulario de
 * cargue vuelve al paso 1 al limpiar o al cargar otro; el original no tiene
 * cómo olvidar los pasos visitados).
 *
 * <ds-stepper> + <ds-step> — navegación por pasos, vertical con acordeón
 * (Fase 11, adaptado desde Form_Comisiones). Dos custom elements en un
 * mismo archivo a propósito: son un par inseparable (un <ds-step> fuera de
 * un <ds-stepper> no tiene numeración ni reglas de avance), a diferencia de
 * <ds-button>/<ds-toast>, piezas sueltas. Convención de .core.js:
 * docs/05_BACKEND.md §4.
 *
 * <ds-stepper> (contenedor): Shadow DOM = <ol><slot></slot></ol>; los hijos
 * livianos son <ds-step>, enumerados una sola vez en connectedCallback
 * (mismo criterio que el original: `querySelectorAll` una vez, sin soportar
 * agregar/quitar pasos después de montado). Reglas de navegación, idénticas
 * a Form_Comisiones/stepper.js:
 *   - Header de un paso YA VISITADO (índice <= máximo alcanzado): salta
 *     libre en cualquier dirección, sin validar.
 *   - Header del SIGUIENTE inmediato (índice === actual + 1), o el método
 *     `next()`: dispara en el propio <ds-stepper> un evento cancelable
 *     `stepper-before-next` (detail: { index: actual }) — si algo hace
 *     preventDefault() (ej. una validación de formulario), no avanza.
 *   - Cualquier otro salto (2+ pasos adelante sin visitar): no hace nada.
 * Se autoinicializa en el paso 0 al conectarse (a diferencia del original,
 * que asumía el paso 1 ya marcado a mano en el HTML) — mismo espíritu de
 * autosuficiencia que <ds-button> (no requiere que el consumidor prearme
 * clases/atributos de estado).
 *
 * <ds-step> (ítem): agnóstico de las reglas de arriba — solo reporta que su
 * header fue clickeado (evento compuesto `ds-step-select`) y se pinta según
 * los atributos `state` ("pending"|"current"|"completed") y `step` (número,
 * 1-based) que le asigna <ds-stepper>. Atributo propio: `label` (texto del
 * encabezado). Slot por defecto: contenido del panel.
 *
 * Mejora de accesibilidad sobre el original: el panel de un paso no-actual
 * queda `inert` además de `aria-hidden` — en Form_Comisiones el contenido
 * colapsado seguía siendo alcanzable por Tab pese a no ser visible.
 */
class DsStep extends HTMLElement {
  static get observedAttributes() {
    return ['state', 'step', 'label'];
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
    if (this.shadowRoot) {
      this._render();
      return;
    }
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
        }
        :host(:not(:last-child))::after {
          content: '';
          position: absolute;
          z-index: 0;
          top: var(--stepper-indent);
          bottom: var(--stepper-connector-bottom);
          left: var(--stepper-connector-left);
          width: var(--stepper-connector-width);
          background-image: radial-gradient(circle, var(--color-border, currentColor) 1.8px, transparent 2px);
          background-size: 8px 12px;
          background-repeat: repeat-y;
          background-position: center top;
          transition: background-image var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease);
        }
        :host([state="completed"]:not(:last-child))::after {
          background-image: radial-gradient(circle, var(--color-accent, currentColor) 1.8px, transparent 2px);
        }
        .header {
          appearance: none;
          -webkit-appearance: none;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: var(--stepper-header-gap);
          width: 100%;
          box-sizing: border-box;
          padding: var(--stepper-header-padding);
          margin: 0;
          font: inherit;
          color: var(--color-text, inherit);
          text-align: left;
          cursor: pointer;
          background: none;
          border: 1px solid transparent;
          border-radius: var(--radius-sm, 4px);
          transition:
            background var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease),
            border-color var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease);
        }
        .header:hover {
          background: var(--color-surface-alt, transparent);
        }
        .header:focus-visible {
          outline: var(--focus-offset-sm, 2px) solid var(--color-focus, currentColor);
          outline-offset: var(--focus-offset-sm, 2px);
        }
        :host([state="pending"]) .header {
          cursor: default;
        }
        .circle {
          position: relative;
          z-index: 1;
          flex-shrink: 0;
          width: var(--stepper-circle-size);
          height: var(--stepper-circle-size);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-sm, .875rem);
          font-weight: var(--font-weight-bold, 700);
          color: var(--color-text, inherit);
          background: var(--color-surface-alt, transparent);
          border: 1px solid var(--color-border, currentColor);
          border-radius: var(--radius-full, 999px);
          backdrop-filter: blur(var(--surface-blur, 0));
          -webkit-backdrop-filter: blur(var(--surface-blur, 0));
          box-shadow: var(--shadow-sm, none);
          transition:
            background var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease),
            border-color var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease);
        }
        .label {
          font-size: var(--font-size-sm, .875rem);
          color: var(--color-text-muted, inherit);
          transition: color var(--motion-duration-fast, .15s) var(--motion-easing-standard, ease);
        }
        :host([state="current"]) .circle {
          border-width: 2px;
          border-color: var(--color-focus, currentColor);
          background: var(--color-surface, transparent);
        }
        :host([state="current"]) .label {
          color: var(--color-text, inherit);
          font-weight: var(--font-weight-bold, 700);
        }
        :host([state="completed"]) .circle {
          background: var(--color-accent-surface, var(--color-surface-alt, transparent));
          border-color: var(--color-accent, currentColor);
        }
        :host([state="completed"]) .label {
          color: var(--color-text-muted, inherit);
        }
        .panel {
          display: grid;
          grid-template-rows: 0fr;
          margin-left: var(--stepper-indent);
          transition: grid-template-rows var(--motion-duration-slow, .25s) var(--motion-easing-standard, ease);
        }
        :host([state="current"]) .panel {
          grid-template-rows: 1fr;
        }
        .panel-inner {
          overflow: hidden;
        }
        .panel-content {
          display: flex;
          flex-direction: column;
          gap: var(--stepper-panel-gap);
          padding: var(--stepper-panel-padding-block-start) var(--stepper-panel-padding-inline) var(--stepper-panel-padding-block-end);
        }
        @media (prefers-reduced-motion: reduce) {
          .panel { transition: none; }
        }
      </style>
      <button type="button" class="header" part="header">
        <span class="circle" part="circle"></span>
        <span class="label" part="label"></span>
      </button>
      <div class="panel" part="panel">
        <div class="panel-inner">
          <div class="panel-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
    this._header = shadow.querySelector('.header');
    this._circle = shadow.querySelector('.circle');
    this._label = shadow.querySelector('.label');
    this._panel = shadow.querySelector('.panel');

    this._header.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ds-step-select', { bubbles: true, composed: true }));
    });

    this._render();
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    if (!this._header) return;
    const state = this.getAttribute('state') || 'pending';
    const step = this.getAttribute('step') || '';
    const isCurrent = state === 'current';

    this._label.textContent = this.getAttribute('label') || '';
    this._circle.innerHTML = state === 'completed'
      ? '<span aria-hidden="true">✓</span>'
      : String(step);

    this._header.setAttribute('aria-expanded', String(isCurrent));
    this._panel.setAttribute('aria-hidden', String(!isCurrent));
    if (isCurrent) this._panel.removeAttribute('inert');
    else this._panel.setAttribute('inert', '');
  }
}

class DsStepper extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return; // ya montado (reconexión al DOM)
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; }
        ol { list-style: none; margin: 0; padding: 0; width: 100%; }
      </style>
      <ol part="list"><slot></slot></ol>
    `;

    this._steps = Array.from(this.children).filter((el) => el.tagName === 'DS-STEP');
    this._current = 0;
    this._maxReached = 0;

    this._steps.forEach((step, index) => {
      step.setAttribute('step', String(index + 1));
      step.addEventListener('ds-step-select', () => this._onSelect(index));
    });

    this._applyState();
  }

  _onSelect(index) {
    if (index <= this._maxReached) {
      this._current = index; // paso ya visitado: libre en ambas direcciones
      this._applyState();
      return;
    }
    if (index === this._current + 1) this._advanceTo(index); // el siguiente inmediato: valida antes
    // más de un paso adelante: no hace nada (no se puede saltar así)
  }

  _advanceTo(index) {
    const evento = new CustomEvent('stepper-before-next', {
      detail: { index: this._current },
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    if (!this.dispatchEvent(evento)) return;
    this._maxReached = Math.max(this._maxReached, index);
    this._current = index;
    this._applyState();
  }

  /** Navega a `index` aplicando las mismas reglas que el click de un header. */
  goTo(index) {
    if (index < 0 || index >= this._steps.length) return;
    this._onSelect(index);
  }

  /** Adaptación Consulta_Documental: vuelve al paso 0 y olvida los pasos visitados. */
  reset() {
    this._current = 0;
    this._maxReached = 0;
    this._applyState();
  }

  /** Atajo: intenta avanzar al paso siguiente (dispara `stepper-before-next`). */
  next() {
    this.goTo(this._current + 1);
  }

  get currentIndex() {
    return this._current;
  }

  _applyState() {
    this._steps.forEach((step, index) => {
      const state = index < this._current ? 'completed' : index === this._current ? 'current' : 'pending';
      step.setAttribute('state', state);
    });
  }
}

customElements.define('ds-step', DsStep);
customElements.define('ds-stepper', DsStepper);
