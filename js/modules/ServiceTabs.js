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
    this.tabsList = document.querySelector('.services-tabbed .tabs-list');
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
      tab.addEventListener('click', (e) => {
        const isMobile = window.innerWidth <= 1024;
        if (isMobile && this.tabsList) {
          const isOpen = this.tabsList.classList.contains('open');
          if (tab.classList.contains('active')) {
            // Clicked active tab (toggle open/close dropdown)
            this.tabsList.classList.toggle('open');
          } else {
            // Clicked inactive option (select it and close dropdown)
            this.activate(i);
            this.tabsList.classList.remove('open');
          }
        } else {
          // Normal desktop click behavior
          this.activate(i);
        }
      });
    });

    // Close mobile dropdown when clicking outside of it
    document.addEventListener('click', (e) => {
      if (this.tabsList && !this.tabsList.contains(e.target)) {
        this.tabsList.classList.remove('open');
      }
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
