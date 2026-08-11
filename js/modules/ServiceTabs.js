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
    // 1. Support .services-hover section layout
    this.rows = document.querySelectorAll('.services-hover .sh-row');
    this.hoverImgs = document.querySelectorAll('.services-hover .sh-preview-img');
    this.hoverCaption = document.querySelector('.services-hover .sh-preview-caption');

    if (this.rows.length && this.hoverImgs.length) {
      this.titleEl = this.hoverCaption ? this.hoverCaption.querySelector('.ctitle') : null;
      this.metaEl = this.hoverCaption ? this.hoverCaption.querySelector('.cmeta') : null;

      this.rows.forEach((row, i) => {
        const name = (row.dataset.name || '').replace(/&amp;/g, '&');
        row.addEventListener('mouseenter', () => this.activateHover(i, name));
        row.addEventListener('click', () => this.activateHover(i, name));
      });
      return;
    }

    // 2. Fallback for .services-tabbed section layout
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

  /**
   * Hover/click activation for .services-hover rows.
   */
  activateHover(index, name) {
    if (!this.hoverImgs.length) return;
    this.hoverImgs.forEach((img, i) => img.classList.toggle('active', i === index));
    this.rows.forEach((r, i) => r.classList.toggle('active', i === index));

    if (this.hoverCaption && this.titleEl) {
      this.hoverCaption.classList.remove('show');
      setTimeout(() => {
        this.titleEl.textContent = name;
        if (this.metaEl) {
          this.metaEl.textContent = 'Service / 0' + (index + 1);
        }
        this.hoverCaption.classList.add('show');
      }, 100);
    }
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
