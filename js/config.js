/**
 * @fileoverview Central configuration for ThirdSpace360.
 * Single source of truth — every module reads its constants from here.
 */

export const CONFIG = {
  hero: {
    /** Milliseconds between automatic slide transitions */
    interval: 5500,
    /** CSS animation-duration string for the indicator fill bar */
    indicatorAnimDuration: '5.5s',
  },

  nav: {
    /** Scroll-Y (px) before the nav receives the `.scrolled` class */
    scrollThreshold: 40,
    /** Viewport width (px) below which the mobile menu is active */
    mobileBreakpoint: 720,
  },

  reveal: {
    /** IntersectionObserver visibility ratio to trigger `.in` */
    threshold: 0.12,
    /** IntersectionObserver root margin */
    rootMargin: '0px 0px -60px 0px',
  },

  form: {
    /** Backend endpoint for enquiry submissions */
    endpoint: '/api/enquiry',
    /** localStorage key used to persist draft form data */
    cacheKey: 't360_enquiry_form',
    /** Delay (ms) before the success message is cleared from the button */
    successResetDelay: 3500,
    /** Delay (ms) before the error message is cleared from the button */
    errorResetDelay: 4000,
    /** Coral colour used for validation error highlights */
    errorColor: '#D05A3F',
    /** DOM IDs of the form fields (order-independent) */
    fieldIds: ['name', 'email', 'phone', 'space', 'city', 'message'],
    /** DOM ID of the hidden honeypot field */
    honeypotId: 'organization_real',
  },

  validation: {
    /** Robust email validation regex */
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /** Indian mobile phone pattern (supports optional +91, 91, 0 prefix, and 10 digits starting with 6-9) */
    phone: /^(?:\+?91|0)?[6-9]\d{9}$/,
  },
};
