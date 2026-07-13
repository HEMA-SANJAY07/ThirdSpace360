/**
 * @fileoverview Pure form-data validation service.
 * No DOM access, no side-effects — receives plain data, returns results.
 */

export class FormValidator {
  /**
   * @param {Object} rules - Validation rules from config.
   * @param {RegExp} rules.email - Email regex pattern.
   * @param {RegExp} rules.phone - Phone regex pattern.
   */
  constructor(rules) {
    this.rules = rules;
  }

  /**
   * Validate a plain form-data object.
   *
   * @param {Object} data - The form field values to validate.
   * @param {string} data.name  - User's name (required).
   * @param {string} data.email - User's email (required, must match pattern).
   * @param {string} [data.phone] - User's phone (optional, validated if provided).
   * @returns {{ valid: boolean, errors: Object<string, string> }}
   */
  validate(data) {
    const errors = {};

    // Name — required, non-empty after trim
    if (!data.name || !data.name.trim()) {
      errors.name = 'Please enter your name.';
    }

    // Email — required, must match configured regex
    const emailVal = (data.email || '').trim();
    if (!emailVal) {
      errors.email = 'Please enter your email address.';
    } else if (!this.rules.email.test(emailVal)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Phone — optional, but if provided it must match configured regex
    const phoneVal = (data.phone || '').trim();
    if (phoneVal && !this.rules.phone.test(phoneVal)) {
      errors.phone = 'Please enter a valid phone number.';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
