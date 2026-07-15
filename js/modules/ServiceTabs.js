/**
 * @fileoverview Service tabs — click-to-switch with image, panel,
 * caption, and ARIA state management.
 *
 * Captions are read from `data-caption` attributes on `<img>` elements
 * instead of a hardcoded array.
 */

export class ServiceTabs {
  constructor() {
    this.tabs = [];
    this.imgs = [];
    this.panels = [];
    this.captionEl = null;
    this.captions = [];
  }

  /**
   * Query the DOM and bind click listeners.
   */
  init() {
    this.tabs = document.querySelectorAll('.services-tabbed .tab');
    this.imgs = document.querySelectorAll('.services-tabbed .tab-img');
    this.panels = document.querySelectorAll('.services-tabbed .tab-panel');
    this.captionEl = document.getElementById('tab-image-caption');

    if (!this.tabs.length) return;

    // Read captions from data-caption attributes on images
    this.captions = Array.from(this.imgs).map(
      (img) => img.getAttribute('data-caption') || '',
    );

    this.tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => this.activate(i));
    });
  }

  /* ---- Public --------------------------------------------------------- */

  /**
   * Switch to the tab at `index`.
   *
   * @param {number} index
   */
  activate(index) {
    // Update tab states + ARIA
    this.tabs.forEach((t, i) => {
      const isActive = i === index;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update images
    this.imgs.forEach((img, i) => img.classList.toggle('active', i === index));

    // Update panels
    this.panels.forEach((p, i) => p.classList.toggle('active', i === index));

    // Caption fade transition
    if (this.captionEl && this.captions[index] !== undefined) {
      this.captionEl.classList.remove('show');
      setTimeout(() => {
        this.captionEl.textContent = this.captions[index];
        this.captionEl.classList.add('show');
      }, 120);
    }
  }
}
