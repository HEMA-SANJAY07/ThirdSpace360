/**
 * @fileoverview Cloudflare Turnstile CAPTCHA abstraction.
 * Guards all calls so the application works even when the
 * Turnstile SDK is not loaded (dev environments, ad-blockers, etc.).
 */

export class CaptchaProvider {
  /**
   * Check whether the Turnstile SDK is present on the page.
   *
   * @returns {boolean}
   */
  isAvailable() {
    return typeof turnstile !== 'undefined';
  }

  /**
   * Retrieve the current CAPTCHA response token.
   *
   * @returns {string|null} The token string, or null if unavailable.
   */
  getToken() {
    try {
      if (this.isAvailable()) {
        return turnstile.getResponse() || null;
      }
    } catch (e) {
      console.warn('CaptchaProvider: getToken failed —', e);
    }
    return null;
  }

  /**
   * Reset the CAPTCHA widget so it can be solved again.
   */
  reset() {
    try {
      if (this.isAvailable()) {
        turnstile.reset();
      }
    } catch (e) {
      console.warn('CaptchaProvider: reset failed —', e);
    }
  }

  /**
   * Whether the user has completed the CAPTCHA challenge.
   *
   * @returns {boolean}
   */
  isComplete() {
    return !!this.getToken();
  }
}
