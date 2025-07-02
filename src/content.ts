interface FieldInfo {
  selector: string;
  label: string;
}

function getSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const name = (el as HTMLInputElement).name;
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
  return '';
}

/**
 * Generates a unique and stable CSS selector for a given element.
 * Prioritizes ID, then name, then a combination of tag and attributes.
 */
function getUniqueSelector(el: Element): string {
  if (el.id) {
    // Escape special characters in ID
    const escapedId = el.id.replace(/([^\w\d\s-])/g, '\\$1');
    return `#${escapedId}`;
  }
  if (el.getAttribute('name')) {
    return `${el.tagName.toLowerCase()}[name="${el.getAttribute('name')}"]`;
  }
  
  // Fallback for elements without id or name
  let selector = el.tagName.toLowerCase();
  const type = el.getAttribute('type');
  if (type) {
    selector += `[type="${type}"]`;
  }
  
  // To make it more unique, find its index among siblings of the same type
  let index = 1;
  let sibling = el.previousElementSibling;
  while (sibling) {
    if (sibling.matches(selector)) {
      index++;
    }
    sibling = sibling.previousElementSibling;
  }
  return `${selector}:nth-of-type(${index})`;
}

/**
 * Intelligently extracts all possible context clues about a form field.
 * Returns a comprehensive description to help AI understand the field's purpose.
 */
function analyzeField(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const clues = [];
  
  // 1. Direct labels (most reliable)
  if (field.labels && field.labels.length > 0) {
    for (let label of field.labels) {
      clues.push(`Label: "${label.innerText.trim()}"`);
    }
  }
  
  // 2. Placeholder text
  if (field.placeholder) {
    clues.push(`Placeholder: "${field.placeholder.trim()}"`);
  }
  
  // 3. HTML attributes that might give clues
  if (field.name) clues.push(`Name: "${field.name}"`);
  if (field.id) clues.push(`ID: "${field.id}"`);
  if (field.className) clues.push(`Class: "${field.className}"`);
  if (field.title) clues.push(`Title: "${field.title}"`);
  
  // 4. Autocomplete attribute (HTML5 standard field types)
  const autocomplete = field.getAttribute('autocomplete');
  if (autocomplete) clues.push(`Autocomplete: "${autocomplete}"`);
  
  // 5. ARIA attributes for accessibility
  const ariaLabel = field.getAttribute('aria-label');
  if (ariaLabel) clues.push(`ARIA Label: "${ariaLabel}"`);
  
  const ariaDescribedBy = field.getAttribute('aria-describedby');
  if (ariaDescribedBy) {
    const description = document.getElementById(ariaDescribedBy);
    if (description) clues.push(`ARIA Description: "${description.innerText.trim()}"`);
  }
  
  // 6. Look for nearby text that might describe the field
  const nearbyText = [];
  
  // Check previous sibling elements for descriptive text
  let prev = field.previousElementSibling;
  let prevCount = 0;
  while (prev && prevCount < 3) {
    const text = prev.innerText?.trim();
    if (text && text.length < 100 && text.length > 2) {
      nearbyText.push(`Before: "${text}"`);
    }
    prev = prev.previousElementSibling;
    prevCount++;
  }
  
  // Check parent containers for section headers
  let parent = field.parentElement;
  let parentCount = 0;
  while (parent && parentCount < 3) {
    // Look for headings in parent
    const headings = parent.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, .section-title, .form-section');
    headings.forEach(heading => {
      const text = heading.textContent?.trim();
      if (text && text.length < 50) {
        nearbyText.push(`Section: "${text}"`);
      }
    });
    parent = parent.parentElement;
    parentCount++;
  }
  
  if (nearbyText.length > 0) {
    clues.push(...nearbyText.slice(0, 3)); // Limit to 3 most relevant
  }
  
  // 7. Field type information and special handling
  const fieldType = field.type || field.tagName.toLowerCase();
  clues.push(`Type: ${fieldType}`);
  if (field.required) clues.push('Required: true');
  
  // 8. Special handling for different input types
  if (field.tagName.toLowerCase() === 'select') {
    // For dropdowns, collect all available options
    const select = field as HTMLSelectElement;
    const options = Array.from(select.options)
      .map(option => option.text.trim())
      .filter(text => text.length > 0)
      .slice(0, 10); // Limit to first 10 options to avoid overwhelming AI
    
    if (options.length > 0) {
      clues.push(`Available options: [${options.map(opt => `"${opt}"`).join(', ')}]`);
    }
  } else if (fieldType === 'checkbox') {
    clues.push('Type: checkbox (expects true/false)');
    if ((field as HTMLInputElement).checked) {
      clues.push('Currently checked: true');
    }
  } else if (fieldType === 'radio') {
    clues.push('Type: radio button (expects true/false)');
    // Find other radio buttons with the same name to show options
    if (field.name) {
      const radioGroup = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
      const radioOptions = Array.from(radioGroup)
        .map(radio => {
          const radioField = radio as HTMLInputElement;
          return radioField.value || radioField.id || 'unknown';
        })
        .slice(0, 5);
      
      if (radioOptions.length > 1) {
        clues.push(`Radio group options: [${radioOptions.map(opt => `"${opt}"`).join(', ')}]`);
      }
    }
  }
  
  // Combine all clues into a descriptive string
  return clues.length > 0 ? clues.join('; ') : 'Unknown field';
}

/**
 * Scans the document for all fillable fields with comprehensive context analysis.
 */
function scanFields(): any[] {
  const fields = [];
  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select';
  
  document.querySelectorAll(selector).forEach((el) => {
    const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // Skip invisible fields (likely not meant for user input)
    const style = getComputedStyle(field);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return;
    }
    
    const uniqueSelector = getUniqueSelector(field);
    const fieldDescription = analyzeField(field);
    
    fields.push({
      selector: uniqueSelector,
      description: fieldDescription,
    });
  });
  
  return fields;
}

/**
 * Fills the form with the provided data and highlights the fields.
 * Handles different input types appropriately.
 */
function fillForm(data: Record<string, string>): void {
  for (const selector in data) {
    const element = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    if (element) {
      const value = data[selector];
      let filled = false;
      
      // Handle different input types
      if (element.tagName.toLowerCase() === 'select') {
        // For dropdowns, find and select the matching option
        const select = element as HTMLSelectElement;
        for (let option of select.options) {
          if (option.text.toLowerCase().includes(value.toLowerCase()) || 
              option.value.toLowerCase().includes(value.toLowerCase())) {
            select.selectedIndex = option.index;
            filled = true;
            break;
          }
        }
      } else if (element.type === 'checkbox' || element.type === 'radio') {
        // For checkboxes and radio buttons, set checked state
        const inputElement = element as HTMLInputElement;
        const shouldCheck = value.toLowerCase() === 'true' || 
                           value.toLowerCase() === 'yes' || 
                           value.toLowerCase() === '1' ||
                           value.toLowerCase() === 'on';
        inputElement.checked = shouldCheck;
        filled = true;
      } else {
        // For regular text inputs, textareas, etc.
        (element as HTMLInputElement).value = value;
        filled = true;
      }
      
      if (filled) {
        // Trigger appropriate events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Highlight the field
        element.style.outline = '2px solid yellow';
        setTimeout(() => {
          element.style.outline = '';
        }, 1000);
      }
    }
  }
}

// Import browser compatibility layer
declare const browserAPI: any;

// Inject browser-compat module into content script
if (typeof window !== 'undefined' && !window.browserAPI) {
  // For content scripts, we need to create a minimal version since we can't import ES modules directly
  const isChrome = typeof chrome !== 'undefined' && !!chrome.runtime;
  const isFirefox = typeof browser !== 'undefined' && !!browser.runtime;
  const api = isFirefox ? browser : chrome;
  
  // Simple browser detection
  let browserName = 'Chrome';
  if (navigator.userAgent.includes('Arc/')) browserName = 'Arc';
  else if (navigator.userAgent.includes('Edg/')) browserName = 'Edge';
  else if (navigator.userAgent.includes('Firefox/')) browserName = 'Firefox';
  
  window.browserAPI = {
    name: browserName,
    runtime: {
      sendMessage: (message: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.runtime.sendMessage(message).then(resolve).catch(reject);
            } else {
              api.runtime.sendMessage(message, (response: any) => {
                if (api.runtime.lastError) {
                  reject(new Error(api.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            }
          } catch (error) {
            reject(error);
          }
        });
      },
      onMessage: {
        addListener: (callback: any) => api.runtime.onMessage.addListener(callback)
      }
    }
  };
}

/**
 * Main message listener for the content script.
 */
window.browserAPI?.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.type === 'start_fill') {
    (async () => {
      console.log(`[EasyDaddy] Scanning page for forms (${window.browserAPI?.name || 'unknown'})...`);
      const pageContext = {
        url: location.href,
        title: document.title,
        fields: scanFields(),
      };

      console.log('[EasyDaddy] Asking AI for autofill data...');
      try {
        const fillData = await window.browserAPI.runtime.sendMessage({
          type: 'autofill',
          context: pageContext,
          profile: message.profile,
          instructions: message.instructions,
        });

        // --- CRITICAL LOGGING ---
        console.log('[EasyDaddy] Received data from AI to fill:', fillData);

        if (fillData && !fillData.error && Object.keys(fillData).length > 0) {
          console.log('[EasyDaddy] Filling form...');
          fillForm(fillData);
          sendResponse({ success: true, fieldsFound: pageContext.fields.length, fieldsFilled: Object.keys(fillData).length });
        } else if (fillData?.error) {
          console.error('[EasyDaddy] AI returned error:', fillData.error);
          sendResponse({ success: false, error: fillData.error });
        } else {
          console.log('[EasyDaddy] AI returned no data to fill, stopping.');
          sendResponse({ success: true, fieldsFound: pageContext.fields.length, fieldsFilled: 0 });
        }
      } catch (error) {
        console.error('[EasyDaddy] Error during form filling:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Indicates async response
  }
});

console.log(`[EasyDaddy] Content script loaded and ready (${window.browserAPI?.name || 'unknown'}).`);
