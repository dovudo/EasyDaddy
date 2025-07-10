// EasyDaddy Universal Content Script (cross-browser, edge-case aware)
// Поддержка: Safari iOS, Firefox Focus, Arc, Chrome, Edge, Shadow DOM, iframe, React

import { ipc, FormField, MessageTypes, BrowserCapabilities } from './shared/ipc.js';

class EasyDaddyContentScript {
  private capabilities: BrowserCapabilities;
  private lastScanTime = 0;
  private scanCache: FormField[] = [];

  constructor() {
    this.capabilities = ipc.browserCapabilities;
    this.setupMessageHandlers();
    this.setupFormDetection();
    this.setupSafariIntegration();
    console.log(`[EasyDaddy Content] Initialized on ${this.capabilities.name} ${this.capabilities.platform}`);
  }

  private setupMessageHandlers() {
    ipc.onMessage(MessageTypes.FORM_SCAN, async (msg: any) => this.scanForms(msg.payload));
    ipc.onMessage(MessageTypes.GET_PAGE_CONTEXT, async () => this.getPageContext());
    ipc.onMessage(MessageTypes.FILL_FORMS, async (msg: any) => this.fillForms(msg.payload));
    ipc.onMessage(MessageTypes.FORM_SUBMITTED, async (msg: any) => this.handleFormSubmitted(msg.payload));
    // Legacy
    ipc.onMessage(MessageTypes.START_FILL, async (msg: any) => this.handleLegacyFill(msg));
  }

  private async scanForms(options = {}): Promise<{ fields: FormField[] }> {
    const now = Date.now();
    if (now - this.lastScanTime < 5000 && this.scanCache.length > 0) {
      return { fields: this.scanCache };
    }
    const fields = this.detectFormFields(options);
    this.scanCache = fields;
    this.lastScanTime = now;
    return { fields };
  }

  private detectFormFields(options: any): FormField[] {
    // Поддержка Shadow DOM, iframe, React/Angular/Vue
    const selector = options.selector ||
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select';
    const elements = this.queryAllDeep(selector);
    const fields: FormField[] = [];
    elements.forEach((element) => {
      if (!this.isVisible(element) && !options.includeHidden) return;
      fields.push(this.describeField(element));
    });
    return fields;
  }

  private describeField(element: Element): FormField {
    // Универсальный анализ поля (label, placeholder, aria, context, options)
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type?.toLowerCase() || tagName;
    const label = this.getFieldLabel(element);
    const placeholder = (element as HTMLInputElement).placeholder || undefined;
    const required = (element as HTMLInputElement).required || element.getAttribute('aria-required') === 'true';
    const value = (element as HTMLInputElement).value || undefined;
    const options = tagName === 'select' ? this.getFieldOptions(element as HTMLSelectElement) : undefined;
    const attributes = this.getRelevantAttributes(element);
    const rect = element.getBoundingClientRect();
    return {
      selector: this.generateSelector(element),
      type: this.getFieldType(element),
      description: this.analyzeField(element),
      label,
      placeholder,
      required,
      value,
      options,
      attributes,
      rect
    };
  }

  private getFieldType(field: Element): FormField['type'] {
    const tagName = field.tagName.toLowerCase();
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'select') return 'select';
    const type = (field as HTMLInputElement).type?.toLowerCase();
    switch (type) {
      case 'email': return 'email';
      case 'tel': return 'tel';
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      case 'number': return 'number';
      case 'password': return 'password';
      default: return 'text';
    }
  }

  private getFieldLabel(field: Element): string | undefined {
    // Поиск label через <label>, aria-labelledby, placeholder
    const input = field as HTMLInputElement;
    if (input.labels && input.labels.length > 0) return input.labels[0].textContent?.trim();
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) return label.textContent?.trim();
    }
    const labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent?.trim();
    }
    return input.placeholder;
  }

  private getFieldOptions(field: HTMLSelectElement): string[] {
    return Array.from(field.options).map(option => option.text.trim()).filter(Boolean);
  }

  private getRelevantAttributes(field: Element): Record<string, string> {
    const relevant = ['name', 'id', 'class', 'type', 'autocomplete', 'data-testid'];
    const attributes: Record<string, string> = {};
    relevant.forEach(attr => {
      const value = field.getAttribute(attr);
      if (value) attributes[attr] = value;
    });
    return attributes;
  }

  private analyzeField(field: Element): string {
    // Краткое описание поля для AI (label, placeholder, aria, context)
    const clues: string[] = [];
    const label = this.getFieldLabel(field);
    if (label) clues.push(`Label: "${label}"`);
    const placeholder = (field as HTMLInputElement).placeholder;
    if (placeholder) clues.push(`Placeholder: "${placeholder}"`);
    const autocomplete = field.getAttribute('autocomplete');
    if (autocomplete) clues.push(`Autocomplete: "${autocomplete}"`);
    const ariaLabel = field.getAttribute('aria-label');
    if (ariaLabel) clues.push(`ARIA Label: "${ariaLabel}"`);
    // Context: section headers, nearby text
    const context = this.getFieldContext(field);
    if (context) clues.push(`Context: "${context}"`);
    if (field.tagName === 'SELECT') {
      const options = this.getFieldOptions(field as HTMLSelectElement);
      if (options.length > 0) clues.push(`Options: [${options.slice(0, 5).map(o => `"${o}"`).join(', ')}]`);
    }
    return clues.join('; ') || 'Unknown field';
  }

  private getFieldContext(field: Element): string {
    // Поиск заголовков секций, ближайшего текста
    const contexts: string[] = [];
    let parent = field.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, .form-section-title');
      headings.forEach(heading => {
        const text = heading.textContent?.trim();
        if (text && text.length < 100) contexts.push(text);
      });
      parent = parent.parentElement;
      depth++;
    }
    return contexts[0] || '';
  }

  private getPageContext(): any {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      browserInfo: `${this.capabilities.name} ${this.capabilities.version} on ${this.capabilities.platform}`,
      formCount: document.querySelectorAll('form').length,
      fieldCount: this.scanCache.length,
      language: document.documentElement.lang || 'en',
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      fields: this.scanCache
    };
  }

  private async fillForms(payload: any): Promise<any> {
    const { fillData, testMode, browserOptimizations } = payload;
    let fieldsFound = 0;
    let fieldsFilled = 0;
    const errors: string[] = [];
    for (const [selector, value] of Object.entries(fillData)) {
      fieldsFound++;
      try {
        const element = this.querySelectorDeep(selector) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!element) {
          errors.push(`Element not found: ${selector}`);
          continue;
        }
        const filled = await this.fillSingleField(element, value as string, testMode, browserOptimizations);
        if (filled) fieldsFilled++;
      } catch (error) {
        errors.push(`Error filling ${selector}: ${error.message}`);
      }
    }
    return { fieldsFound, fieldsFilled, errors: errors.length > 0 ? errors : undefined };
  }

  private async fillSingleField(element: HTMLElement, value: string, testMode = false, browserOptimizations?: any): Promise<boolean> {
    // Поддержка Safari iOS slow typing, React events, CSP
    const tagName = element.tagName.toLowerCase();
    const type = (element as HTMLInputElement).type?.toLowerCase();
    try {
      if (tagName === 'select') {
        return this.fillSelectField(element as HTMLSelectElement, value, testMode);
      } else if (type === 'checkbox' || type === 'radio') {
        return this.fillCheckboxRadio(element as HTMLInputElement, value, testMode);
      } else {
        if (browserOptimizations?.slowTyping) {
          await this.typeValueSlowly(element as HTMLInputElement, value);
        } else {
          (element as HTMLInputElement).value = value;
          this.triggerEvents(element, browserOptimizations);
        }
        this.highlightField(element);
        return true;
      }
    } catch (error) {
      console.error(`[EasyDaddy] Error filling field:`, error);
      return false;
    }
  }

  private fillSelectField(select: HTMLSelectElement, value: string, testMode: boolean): boolean {
    for (let option of select.options) {
      if (option.text.toLowerCase().includes(value.toLowerCase()) || option.value.toLowerCase().includes(value.toLowerCase())) {
        if (!testMode) {
          select.selectedIndex = option.index;
          this.triggerEvents(select);
          this.highlightField(select);
        }
        return true;
      }
    }
    return false;
  }

  private fillCheckboxRadio(input: HTMLInputElement, value: string, testMode: boolean): boolean {
    const shouldCheck = ['true', 'yes', '1', 'on', 'checked'].includes(value.toLowerCase());
    if (!testMode) {
      input.checked = shouldCheck;
      this.triggerEvents(input);
      this.highlightField(input);
    }
    return true;
  }

  private async typeValueSlowly(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    for (let i = 0; i < value.length; i++) {
      input.value += value[i];
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private triggerEvents(element: HTMLElement, browserOptimizations?: any) {
    const events = ['input', 'change', 'blur', 'keyup'];
    events.forEach(eventType => {
      element.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
    if (browserOptimizations?.useReactEvents || this.hasReactProps(element)) {
      this.triggerReactEvents(element);
    }
  }

  private hasReactProps(element: HTMLElement): boolean {
    return Object.keys(element).some(key => key.startsWith('__react'));
  }

  private triggerReactEvents(element: HTMLElement) {
    const nativeEvent = new Event('input', { bubbles: true });
    Object.defineProperty(nativeEvent, 'target', { value: element });
    Object.defineProperty(nativeEvent, 'currentTarget', { value: element });
    element.dispatchEvent(nativeEvent);
  }

  private highlightField(element: HTMLElement) {
    const originalStyle = element.style.cssText;
    element.style.outline = '3px solid #4CAF50';
    element.style.transition = 'outline 0.3s ease';
    setTimeout(() => {
      element.style.outline = '1px solid #2196F3';
      setTimeout(() => {
        element.style.cssText = originalStyle;
      }, 1000);
    }, 500);
  }

  private setupFormDetection() {
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
    // Watch for dynamic form changes (SPA)
    const observer = new MutationObserver((mutations) => {
      const hasNewForms = mutations.some(mutation =>
        Array.from(mutation.addedNodes).some(node =>
          node.nodeType === Node.ELEMENT_NODE &&
          ((node as Element).tagName === 'FORM' || (node as Element).querySelector?.('form'))
        )
      );
      if (hasNewForms) {
        this.scanCache = [];
        this.lastScanTime = 0;
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private async handleFormSubmit(event: Event) {
    try {
      const form = event.target as HTMLFormElement;
      if (!form || form.tagName !== 'FORM') return;
      const formData = this.extractFormData(form);
      if (Object.keys(formData).length === 0) return;
      await ipc.sendMessage({
        type: MessageTypes.FORM_SUBMITTED,
        payload: {
          url: window.location.href,
          domain: window.location.hostname,
          fields: formData,
          timestamp: new Date().toISOString(),
          browserInfo: `${this.capabilities.name} ${this.capabilities.platform}`
        }
      });
    } catch (error) {
      console.error('[EasyDaddy] Form submission error:', error);
    }
  }

  private extractFormData(form: HTMLFormElement): Record<string, string> {
    const data: Record<string, string> = {};
    const formData = new FormData(form);
    formData.forEach((value, key) => {
      if (typeof value === 'string' && value.trim()) {
        data[key] = value.trim();
      }
    });
    return data;
  }

  private async handleFormSubmitted(payload: any) {
    // Показываем inline notification для auto-save (универсально)
    this.showSavePrompt(payload);
  }

  private showSavePrompt(response: any) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      cursor: pointer;
    `;
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🔒 EasyDaddy</div>
      <div>Save ${Object.keys(response.newFields || {}).length} new fields to profile?</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">Click to save</div>
    `;
    notification.addEventListener('click', async () => {
      try {
        await ipc.sendMessage({ type: MessageTypes.FORM_SUBMITTED, payload: response.data });
        notification.style.background = '#2196F3';
        notification.innerHTML = '<div style="font-weight: bold;">✅ Saved to profile!</div>';
        setTimeout(() => notification.remove(), 2000);
      } catch (error) {
        console.error('[EasyDaddy] Error saving form data:', error);
        notification.remove();
      }
    });
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 10000);
  }

  private setupSafariIntegration() {
    if (this.capabilities.name === 'Safari' && this.capabilities.platform === 'iOS') {
      this.setupSafariMessageBridge();
    }
  }

  private setupSafariMessageBridge() {
    window.addEventListener('webkit.messageHandlers.formFill', (event: any) => {
      this.fillForms(event.detail);
    });
  }

  // --- Deep query utilities for Shadow DOM/iframe ---
  private queryAllDeep(selector: string, root: Document | ShadowRoot = document): Element[] {
    let results: Element[] = Array.from(root.querySelectorAll(selector));
    // Shadow DOM
    Array.from(root.querySelectorAll('*')).forEach(el => {
      if (el.shadowRoot) {
        results = results.concat(this.queryAllDeep(selector, el.shadowRoot));
      }
    });
    // iframe
    if (root instanceof Document) {
      Array.from(root.querySelectorAll('iframe')).forEach((iframe: HTMLIFrameElement) => {
        try {
          if (iframe.contentDocument) {
            results = results.concat(this.queryAllDeep(selector, iframe.contentDocument));
          }
        } catch {}
      });
    }
    return results;
  }

  private querySelectorDeep(selector: string, root: Document | ShadowRoot = document): Element | null {
    const all = this.queryAllDeep(selector, root);
    return all[0] || null;
  }

  private generateSelector(element: Element): string {
    if (element.id) return `#${element.id.replace(/([^\w\s-])/g, '\\$1')}`;
    if (element.getAttribute('name')) return `${element.tagName.toLowerCase()}[name="${element.getAttribute('name')}"]`;
    const testId = element.getAttribute('data-testid') || element.getAttribute('data-cy');
    if (testId) return `[data-testid="${testId}"]`;
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-child(${index})`;
    }
    return element.tagName.toLowerCase();
  }

  private handleLegacyFill(message: any) {
    // Для обратной совместимости с popup
    return this.fillForms({
      fillData: message.profile,
      testMode: false
    });
  }
}

// Инициализация content script
new EasyDaddyContentScript(); 