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
  
  // 7. Field type information
  clues.push(`Type: ${field.type || field.tagName.toLowerCase()}`);
  if (field.required) clues.push('Required: true');
  
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
 */
function fillForm(data: Record<string, string>): void {
  for (const selector in data) {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (element) {
      element.value = data[selector];
      element.dispatchEvent(new Event('input', { bubbles: true }));

      // Highlight the field
      element.style.outline = '2px solid yellow';
      setTimeout(() => {
        element.style.outline = '';
      }, 1000);
    }
  }
}

/**
 * Main message listener for the content script.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start_fill') {
    (async () => {
      console.log('EasyDaddy: Scanning page for forms...');
      const pageContext = {
        url: location.href,
        title: document.title,
        fields: scanFields(),
      };

      console.log('EasyDaddy: Asking AI for autofill data...');
      const fillData = await chrome.runtime.sendMessage({
        type: 'autofill',
        context: pageContext,
        profile: message.profile,
      });

      // --- CRITICAL LOGGING ---
      console.log('EasyDaddy: Received data from AI to fill:', fillData);

      if (fillData && Object.keys(fillData).length > 0) {
        console.log('EasyDaddy: Filling form...');
        fillForm(fillData);
      } else {
        console.log('EasyDaddy: AI returned no data to fill, stopping.');
      }
      
      sendResponse({ success: true });
    })();
    return true; // Indicates async response
  }
});

console.log('EasyDaddy content script loaded and ready.');
