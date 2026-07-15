/**
 * @fileoverview Enquiry form orchestrator.
 * Coordinates validation, persistence, CAPTCHA, and API submission
 * through dependency-injected services.
 *
 * Fixes applied:
 * - FN-01: Listens for `submit` event on a `<form>`, not an inline `onclick`.
 * - FN-02: Double-submit guard via `this.isSubmitting` flag, cleared in `finally`.
 * - FN-03: Checks CAPTCHA completion before submission; shows user-friendly msg.
 * - FN-10: Forced reflow between shake class remove/add; field-level error msgs.
 */

export class EnquiryForm {
  /**
   * @param {Object} deps
   * @param {import('../services/FormValidator.js').FormValidator}   deps.validator
   * @param {import('../services/FormPersistence.js').FormPersistence} deps.persistence
   * @param {import('../services/ApiClient.js').ApiClient}           deps.api
   * @param {import('../services/CaptchaProvider.js').CaptchaProvider} deps.captcha
   * @param {Object} deps.config - `CONFIG.form` subset.
   */
  constructor({ validator, persistence, api, captcha, config }) {
    this.validator = validator;
    this.persistence = persistence;
    this.api = api;
    this.captcha = captcha;
    this.config = config;

    /** @type {boolean} Double-submit guard (FN-02). */
    this.isSubmitting = false;

    this.formEl = null;
    this.els = {};
    this.btn = null;
    this.originalBtnHTML = '';
  }

  /* ==================================================================== */
  /*  Initialisation                                                       */
  /* ==================================================================== */

  /**
   * Query DOM, restore cached draft, bind listeners.
   */
  init() {
    this.formEl = document.getElementById('enquiry-form');
    if (!this.formEl) return;

    this.btn = this.formEl.querySelector('.submit-btn');
    this._queryFields();

    if (this.btn) {
      this.originalBtnHTML = this.btn.innerHTML;
    }

    // Restore draft from localStorage
    this._restoreDraft();

    // Cache on every keystroke / selection change
    this.config.fieldIds.forEach((id) => {
      const el = this.els[id];
      if (!el) return;
      el.addEventListener('input', () => this._cacheDraft());
      if (el.tagName === 'SELECT') {
        el.addEventListener('change', () => this._cacheDraft());
      }
    });

    // FN-01 — listen on the `<form>` submit event (covers Enter key + button)
    this.formEl.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /* ==================================================================== */
  /*  Public API                                                           */
  /* ==================================================================== */

  /**
   * Collect all field values into a plain object.
   *
   * @returns {Object}
   */
  getFormData() {
    const data = {};
    this.config.fieldIds.forEach((id) => {
      const el = this.els[id];
      data[id] = el ? el.value.trim() : '';
    });
    return data;
  }

  /**
   * Main submit orchestrator.
   *
   * @param {Event} event
   */
  async handleSubmit(event) {
    if (event) event.preventDefault();

    // FN-02 — double-submit guard
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      // 1. Clear previous error states
      this.clearFieldErrors();

      // 2. Validate
      const data = this.getFormData();
      const { valid, errors } = this.validator.validate(data);

      if (!valid) {
        Object.entries(errors).forEach(([field, message]) => {
          const el = this.els[field];
          if (el) this.showFieldError(el, message);
        });
        return; // exit — the finally block will reset the flag
      }

      // 3. FN-03 — CAPTCHA check
      if (this.captcha.isAvailable() && !this.captcha.isComplete()) {
        this._showCaptchaError('Please complete the security check.');
        return;
      }

      // 4. Build payload
      const honeypotEl = document.getElementById(this.config.honeypotId);
      const payload = {
        ...data,
        honeypot: honeypotEl ? honeypotEl.value.trim() : '',
        turnstileToken: this.captcha.getToken() || '',
      };

      // 5. Loading state
      this._setBtnLoading();

      // 6. API call
      await this.api.submit(payload);

      // 7. Success path
      this.persistence.clear();
      this.captcha.reset();
      this._clearFormFields();
      this._setBtnSuccess();

      // Keep success message visible, then reset text
      await this._delay(this.config.successResetDelay);
      this._resetBtn();
    } catch (err) {
      console.error('Enquiry submission failure:', err);
      this._setBtnError();
      await this._delay(this.config.errorResetDelay);
      this._resetBtn();
    } finally {
      // FN-02 — always release the guard
      this.isSubmitting = false;
    }
  }

  /* ==================================================================== */
  /*  Field-level error helpers                                            */
  /* ==================================================================== */

  /**
   * Display an error state and message below a field element.
   *
   * @param {HTMLElement} fieldEl - The input/select/textarea.
   * @param {string}      message - Human-readable error string.
   */
  showFieldError(fieldEl, message) {
    // If the element is hidden (like the native select), target the custom select visual replacement
    const targetEl = (fieldEl.tagName === 'SELECT' && fieldEl.style.display === 'none')
      ? document.getElementById('custom-space-select')
      : fieldEl;

    if (targetEl) {
      targetEl.style.borderBottomColor = this.config.errorColor;
      targetEl.classList.remove('shake');
      void targetEl.offsetWidth; // force reflow
      targetEl.classList.add('shake');
    }

    // Insert or update error message span
    let msgEl = fieldEl.parentElement?.querySelector('.field-error-msg');
    if (!msgEl) {
      msgEl = document.createElement('span');
      msgEl.classList.add('field-error-msg');
      fieldEl.parentElement?.appendChild(msgEl);
    }
    msgEl.textContent = message;
    msgEl.style.display = 'block';
    
    // Force a small reflow and add the visible class for transition (opacity & transform)
    void msgEl.offsetHeight;
    msgEl.classList.add('visible');
  }

  /**
   * Remove all field-level error states from the form.
   */
  clearFieldErrors() {
    this.config.fieldIds.forEach((id) => {
      const el = this.els[id];
      if (!el) return;

      const targetEl = (el.tagName === 'SELECT' && el.style.display === 'none')
        ? document.getElementById('custom-space-select')
        : el;

      if (targetEl) {
        targetEl.style.borderBottomColor = '';
        targetEl.classList.remove('shake');
      }

      const msg = el.parentElement?.querySelector('.field-error-msg');
      if (msg) {
        msg.classList.remove('visible');
        msg.textContent = '';
        msg.style.display = 'none';
      }
    });

    // Also clear any CAPTCHA error
    this._clearCaptchaError();
  }

  /* ==================================================================== */
  /*  Private helpers                                                       */
  /* ==================================================================== */

  _queryFields() {
    this.config.fieldIds.forEach((id) => {
      this.els[id] = document.getElementById(id);
    });
  }

  _restoreDraft() {
    const cached = this.persistence.load();
    if (!cached) return;
    this.config.fieldIds.forEach((id) => {
      if (cached[id] && this.els[id]) {
        this.els[id].value = cached[id];
      }
    });
  }

  _cacheDraft() {
    const data = {};
    this.config.fieldIds.forEach((id) => {
      const el = this.els[id];
      data[id] = el ? el.value : '';
    });
    this.persistence.save(data);
  }

  _clearFormFields() {
    ['name', 'email', 'phone', 'city', 'message'].forEach((id) => {
      if (this.els[id]) this.els[id].value = '';
    });
    if (this.els.space) this.els.space.value = 'Residential';
  }

  /* ---- CAPTCHA error ------------------------------------------------- */

  _showCaptchaError(msg) {
    const container = this.formEl.querySelector('.cf-turnstile');
    if (!container) return;
    let errEl = container.parentElement?.querySelector('.captcha-error-msg');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.classList.add('captcha-error-msg');
      errEl.style.color = this.config.errorColor;
      errEl.style.fontSize = '0.85rem';
      errEl.style.marginTop = '6px';
      errEl.style.display = 'block';
      container.parentElement?.appendChild(errEl);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  _clearCaptchaError() {
    const errEl = this.formEl?.querySelector('.captcha-error-msg');
    if (errEl) {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  }

  /* ---- Button states ------------------------------------------------- */

  _setBtnLoading() {
    if (!this.btn) return;
    this.btn.disabled = true;
    this.btn.innerHTML = 'Sending enquiry <span class="arrow">...</span>';
    this.btn.style.opacity = '0.75';
  }

  _setBtnSuccess() {
    if (!this.btn) return;
    this.btn.innerHTML =
      'Thank you — we\'ll be in touch <span class="arrow">✓</span>';
    this.btn.style.background = 'var(--sand)';
    this.btn.style.color = 'var(--ink)';
    this.btn.style.opacity = '1';
    // Button stays disabled during the success visual delay
  }

  _setBtnError() {
    if (!this.btn) return;
    this.btn.innerHTML =
      'Submission failed — Retry <span class="arrow">⚠</span>';
    this.btn.style.background = this.config.errorColor;
    this.btn.style.color = 'var(--bone)';
    this.btn.style.opacity = '1';
  }

  _resetBtn() {
    if (!this.btn) return;
    this.btn.innerHTML = this.originalBtnHTML;
    this.btn.style.background = '';
    this.btn.style.color = '';
    this.btn.style.opacity = '';
    this.btn.disabled = false;
  }

  /**
   * Promise-based delay helper.
   *
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
