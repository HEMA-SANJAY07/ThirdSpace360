/**
 * @fileoverview Custom select dropdown module.
 * Replaces native <select> elements with beautifully themed,
 * accessible custom dropdown lists while keeping values in sync.
 */

export class CustomSelect {
  /**
   * @param {string} selectId - ID of native select element to sync
   * @param {string} customSelectId - ID of custom select container
   */
  constructor(selectId, customSelectId) {
    this.selectEl = document.getElementById(selectId);
    this.customEl = document.getElementById(customSelectId);
    this.triggerEl = null;
    this.optionsContainer = null;
    this.options = [];
  }

  /**
   * Initialize custom select controller.
   */
  init() {
    if (!this.selectEl || !this.customEl) return;

    this.triggerEl = this.customEl.querySelector('.custom-select-trigger');
    this.optionsContainer = this.customEl.querySelector('.custom-options');
    this.options = this.customEl.querySelectorAll('.custom-option');

    if (!this.triggerEl || !this.optionsContainer) return;

    // Toggle dropdown open/close on trigger click
    this.triggerEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Toggle dropdown open/close on keyboard Enter/Space
    this.customEl.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Option selection
    this.options.forEach((opt) => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(opt.dataset.value);
      });
    });

    // Close when clicking outside the dropdown
    document.addEventListener('click', () => this.close());

    // Escape key closes dropdown
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Set initial value (handles restored draft caches!)
    this.updateFromNative();

    // Listen to native select change events (e.g. if form resets or is programmatically changed)
    this.selectEl.addEventListener('change', () => this.updateFromNative());
  }

  toggle() {
    const isOpen = this.customEl.classList.toggle('open');
    this.triggerEl.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  open() {
    this.customEl.classList.add('open');
    this.triggerEl.setAttribute('aria-expanded', 'true');
  }

  close() {
    this.customEl.classList.remove('open');
    this.triggerEl.setAttribute('aria-expanded', 'false');
  }

  /**
   * Select a value programmatically.
   * Updates custom dropdown state, syncs native select, and fires input event.
   *
   * @param {string} val
   */
  select(val) {
    // 1. Update native element value
    this.selectEl.value = val;

    // 2. Dispatch events so validators and persistence cache are updated (FN-07)
    this.selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    this.selectEl.dispatchEvent(new Event('input', { bubbles: true }));

    // 3. Update custom UI state
    this.updateFromNative();

    // 4. Close dropdown
    this.close();
  }

  /**
   * Read the value of native select and update custom dropdown trigger text & selected styles.
   */
  updateFromNative() {
    const val = this.selectEl.value;
    
    // Find text associated with current value
    let label = 'Select one…';
    this.options.forEach((opt) => {
      const isSelected = opt.dataset.value === val;
      opt.classList.toggle('selected', isSelected);
      if (isSelected) {
        label = opt.textContent;
      }
    });

    const span = this.triggerEl.querySelector('span');
    if (span) span.textContent = label;
  }
}
