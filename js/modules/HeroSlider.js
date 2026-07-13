/**
 * @fileoverview Hero carousel — auto-rotates slides with progress-bar
 * indicators and supports manual click navigation.
 *
 * Fixes applied:
 * - Animation restart on indicators uses forced reflow (`void el.offsetWidth`).
 * - Indicator `animation-duration` is synced to the configured interval.
 * - Pauses when the browser tab is hidden (visibilitychange).
 */

export class HeroSlider {
  /**
   * @param {Object} config - Hero-specific config.
   * @param {number} config.interval - Auto-rotate interval in ms.
   * @param {string} config.indicatorAnimDuration - CSS animation-duration value.
   */
  constructor(config) {
    this.interval = config.interval;
    this.animDuration = config.indicatorAnimDuration;
    this.slides = [];
    this.indicators = [];
    this.current = 0;
    this.timer = null;
  }

  /**
   * Query DOM elements and start the carousel.
   */
  init() {
    this.slides = document.querySelectorAll('.hero-slide');
    this.indicators = document.querySelectorAll('.hero-indicator');
    if (!this.slides.length) return;

    // Sync CSS animation-duration to the configured interval
    this.indicators.forEach((ind) => {
      ind.style.setProperty('--indicator-duration', this.animDuration);
    });

    // Bind manual indicator clicks
    this.indicators.forEach((ind, i) => {
      ind.addEventListener('click', () => {
        this.showSlide(i);
        this._startTimer();
      });
    });

    // Pause / resume on tab visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._stopTimer();
      } else {
        this._startTimer();
      }
    });

    this._startTimer();
  }

  /* ---- Public --------------------------------------------------------- */

  /**
   * Show a specific slide by index.
   *
   * @param {number} index
   */
  showSlide(index) {
    this.slides.forEach((s, i) => s.classList.toggle('active', i === index));

    this.indicators.forEach((ind, i) => {
      const isActive = i === index;
      // Force animation restart: remove class → reflow → re-add
      ind.classList.remove('active');
      void ind.offsetWidth; // forced reflow
      if (isActive) {
        ind.classList.add('active');
        // Ensure the ::after animation-duration matches the config
        ind.style.animationDuration = this.animDuration;
      }
    });

    this.current = index;
  }

  /* ---- Private -------------------------------------------------------- */

  _startTimer() {
    this._stopTimer();
    this.timer = setInterval(() => {
      this.showSlide((this.current + 1) % this.slides.length);
    }, this.interval);
  }

  _stopTimer() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
