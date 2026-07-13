/**
 * @fileoverview Mobile hamburger menu controller.
 *
 * Fixes applied:
 * - Click-outside-to-close via a dynamically created `.menu-backdrop` div.
 * - Escape key closes the menu.
 * - Full ARIA management (aria-expanded, aria-label).
 * - `body.menu-active` class prevents background scroll.
 */

export class MobileMenu {
  /**
   * @param {Object} navConfig - Nav-specific config.
   * @param {number} navConfig.mobileBreakpoint - Max width for mobile menu.
   */
  constructor(navConfig) {
    this.breakpoint = navConfig.mobileBreakpoint;
    this.nav = null;
    this.toggle = null;
    this.backdrop = null;
    this.isOpen = false;
  }

  /**
   * Query DOM, create backdrop, and bind all listeners.
   */
  init() {
    this.nav = document.getElementById('nav');
    this.toggle = document.querySelector('.menu-toggle');
    if (!this.toggle || !this.nav) return;

    const links = document.querySelectorAll('.nav-links a');
    const cta = document.querySelector('.nav-cta');

    // Create backdrop element
    this._createBackdrop();

    // Hamburger toggle
    this.toggle.addEventListener('click', () => this.toggleMenu());

    // Close on nav link / CTA click
    links.forEach((link) => link.addEventListener('click', () => this.close()));
    if (cta) cta.addEventListener('click', () => this.close());

    // Backdrop click → close
    this.backdrop.addEventListener('click', () => this.close());

    // Escape key → close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Auto-close if window resizes past the breakpoint
    window.addEventListener(
      'resize',
      () => {
        if (window.innerWidth > this.breakpoint) {
          this.close();
        }
      },
      { passive: true },
    );
  }

  /* ---- Public --------------------------------------------------------- */

  /** Toggle the menu open/closed. */
  toggleMenu() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Open the menu. */
  open() {
    if (!this.nav || !this.toggle) return;
    this.isOpen = true;
    this.nav.classList.add('menu-open');
    document.body.classList.add('menu-active');
    this.backdrop.classList.add('visible');
    this.toggle.setAttribute('aria-label', 'Close menu');
    this.toggle.setAttribute('aria-expanded', 'true');
  }

  /** Close the menu. */
  close() {
    if (!this.nav || !this.toggle) return;
    this.isOpen = false;
    this.nav.classList.remove('menu-open');
    document.body.classList.remove('menu-active');
    this.backdrop.classList.remove('visible');
    this.toggle.setAttribute('aria-label', 'Open menu');
    this.toggle.setAttribute('aria-expanded', 'false');
  }

  /* ---- Private -------------------------------------------------------- */

  /** Insert a semi-transparent backdrop before </body>. */
  _createBackdrop() {
    this.backdrop = document.createElement('div');
    this.backdrop.classList.add('menu-backdrop');
    document.body.appendChild(this.backdrop);
  }
}
