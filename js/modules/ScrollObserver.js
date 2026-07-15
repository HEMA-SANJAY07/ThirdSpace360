/**
 * @fileoverview Navigation scroll-state manager and reveal-on-scroll
 * animations via IntersectionObserver.
 */

export class ScrollObserver {
  /**
   * @param {Object} config - Full application config.
   * @param {Object} config.nav - Nav-specific settings.
   * @param {number} config.nav.scrollThreshold - Y offset for `.scrolled`.
   * @param {Object} config.reveal - Reveal IntersectionObserver settings.
   * @param {number} config.reveal.threshold
   * @param {string} config.reveal.rootMargin
   */
  constructor(config) {
    this.scrollThreshold = config.nav.scrollThreshold;
    this.revealOptions = config.reveal;
    this.nav = null;
    this.ticking = false;
  }

  /**
   * Set up the scroll listener and the IntersectionObserver.
   * All DOM queries happen here, not in the constructor.
   */
  init() {
    this.nav = document.getElementById('nav');
    if (this.nav) {
      this._bindScroll();
    }
    this._initRevealObserver();
  }

  /* ---- Private helpers ------------------------------------------------ */

  /** Throttled scroll handler via requestAnimationFrame. */
  _bindScroll() {
    window.addEventListener(
      'scroll',
      () => {
        if (!this.ticking) {
          window.requestAnimationFrame(() => {
            this._onScroll();
            this.ticking = false;
          });
          this.ticking = true;
        }
      },
      { passive: true },
    );
  }

  _onScroll() {
    if (!this.nav) return;
    if (window.scrollY > this.scrollThreshold) {
      this.nav.classList.add('scrolled');
    } else {
      this.nav.classList.remove('scrolled');
    }
  }

  /** Observe `.reveal` elements and add `.in` once visible. */
  _initRevealObserver() {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.revealOptions.threshold,
        rootMargin: this.revealOptions.rootMargin,
      },
    );

    elements.forEach((el) => observer.observe(el));
  }
}
