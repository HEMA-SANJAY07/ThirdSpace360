/**
 * @fileoverview Composition root — wires all services and modules together
 * and initialises them once the DOM is ready.
 */

import { CONFIG } from './config.js';
import { ScrollObserver } from './modules/ScrollObserver.js';
import { HeroSlider } from './modules/HeroSlider.js';
import { ServiceTabs } from './modules/ServiceTabs.js';
import { MobileMenu } from './modules/MobileMenu.js';
import { CustomSelect } from './modules/CustomSelect.js';
import { EnquiryForm } from './modules/EnquiryForm.js';
import { FormValidator } from './services/FormValidator.js';
import { FormPersistence } from './services/FormPersistence.js';
import { CaptchaProvider } from './services/CaptchaProvider.js';
import { ApiClient } from './services/ApiClient.js';

document.addEventListener('DOMContentLoaded', () => {
  // Scroll state + reveal animations
  new ScrollObserver(CONFIG).init();

  // Hero carousel
  new HeroSlider(CONFIG.hero).init();

  // Service section tabs
  new ServiceTabs().init();

  // Mobile hamburger menu
  new MobileMenu(CONFIG.nav).init();

  // Custom themed select dropdown for form
  new CustomSelect('space', 'custom-space-select').init();

  // Enquiry form (dependency-injected)
  const form = new EnquiryForm({
    validator: new FormValidator(CONFIG.validation),
    persistence: new FormPersistence(CONFIG.form.cacheKey),
    api: new ApiClient(CONFIG.form.endpoint),
    captcha: new CaptchaProvider(),
    config: CONFIG.form,
  });
  form.init();
});
