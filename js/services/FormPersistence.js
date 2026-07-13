/**
 * @fileoverview localStorage abstraction for persisting form drafts.
 * All calls are wrapped in try/catch so failures (private browsing,
 * quota exceeded, etc.) never crash the application.
 */

export class FormPersistence {
  /**
   * @param {string} storageKey - The localStorage key to read/write.
   */
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  /**
   * Persist form data to localStorage.
   *
   * @param {Object} data - Plain object to serialise.
   */
  save(data) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('FormPersistence: failed to save —', e);
    }
  }

  /**
   * Load previously saved form data.
   *
   * @returns {Object|null} The parsed data, or null if nothing is stored.
   */
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('FormPersistence: failed to load —', e);
      return null;
    }
  }

  /**
   * Remove the stored form data.
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (e) {
      console.warn('FormPersistence: failed to clear —', e);
    }
  }
}
