var _a, _b;
import { m as makeBus } from "./assets/index-CJ6fAO0g.js";
function getUniqueSelector(el) {
  if (el.id) {
    const escapedId = el.id.replace(/([^\w\d\s-])/g, "\\$1");
    return `#${escapedId}`;
  }
  if (el.getAttribute("name")) {
    return `${el.tagName.toLowerCase()}[name="${el.getAttribute("name")}"]`;
  }
  let selector = el.tagName.toLowerCase();
  const type = el.getAttribute("type");
  if (type) {
    selector += `[type="${type}"]`;
  }
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
function analyzeField(field) {
  var _a2;
  const clues = [];
  if (field.labels && field.labels.length > 0) {
    for (let label of field.labels) {
      clues.push(`Label: "${label.innerText.trim()}"`);
    }
  }
  if (field.placeholder) {
    clues.push(`Placeholder: "${field.placeholder.trim()}"`);
  }
  if (field.name) clues.push(`Name: "${field.name}"`);
  if (field.id) clues.push(`ID: "${field.id}"`);
  if (field.className) clues.push(`Class: "${field.className}"`);
  if (field.title) clues.push(`Title: "${field.title}"`);
  const autocomplete = field.getAttribute("autocomplete");
  if (autocomplete) clues.push(`Autocomplete: "${autocomplete}"`);
  const ariaLabel = field.getAttribute("aria-label");
  if (ariaLabel) clues.push(`ARIA Label: "${ariaLabel}"`);
  const ariaDescribedBy = field.getAttribute("aria-describedby");
  if (ariaDescribedBy) {
    const description = document.getElementById(ariaDescribedBy);
    if (description) clues.push(`ARIA Description: "${description.innerText.trim()}"`);
  }
  const nearbyText = [];
  let prev = field.previousElementSibling;
  let prevCount = 0;
  while (prev && prevCount < 3) {
    const text = (_a2 = prev.innerText) == null ? void 0 : _a2.trim();
    if (text && text.length < 100 && text.length > 2) {
      nearbyText.push(`Before: "${text}"`);
    }
    prev = prev.previousElementSibling;
    prevCount++;
  }
  let parent = field.parentElement;
  let parentCount = 0;
  while (parent && parentCount < 3) {
    const headings = parent.querySelectorAll("h1, h2, h3, h4, h5, h6, legend, .section-title, .form-section");
    headings.forEach((heading) => {
      var _a3;
      const text = (_a3 = heading.textContent) == null ? void 0 : _a3.trim();
      if (text && text.length < 50) {
        nearbyText.push(`Section: "${text}"`);
      }
    });
    parent = parent.parentElement;
    parentCount++;
  }
  if (nearbyText.length > 0) {
    clues.push(...nearbyText.slice(0, 3));
  }
  const fieldType = field.type || field.tagName.toLowerCase();
  clues.push(`Type: ${fieldType}`);
  if (field.required) clues.push("Required: true");
  if (field.tagName.toLowerCase() === "select") {
    const select = field;
    const options = Array.from(select.options).map((option) => option.text.trim()).filter((text) => text.length > 0).slice(0, 10);
    if (options.length > 0) {
      clues.push(`Available options: [${options.map((opt) => `"${opt}"`).join(", ")}]`);
    }
  } else if (fieldType === "checkbox") {
    clues.push("Type: checkbox (expects true/false)");
    if (field.checked) {
      clues.push("Currently checked: true");
    }
  } else if (fieldType === "radio") {
    clues.push("Type: radio button (expects true/false)");
    if (field.name) {
      const radioGroup = document.querySelectorAll(`input[type="radio"][name="${field.name}"]`);
      const radioOptions = Array.from(radioGroup).map((radio) => {
        const radioField = radio;
        return radioField.value || radioField.id || "unknown";
      }).slice(0, 5);
      if (radioOptions.length > 1) {
        clues.push(`Radio group options: [${radioOptions.map((opt) => `"${opt}"`).join(", ")}]`);
      }
    }
  }
  return clues.length > 0 ? clues.join("; ") : "Unknown field";
}
function scanFields() {
  const fields = [];
  const selector = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"]), textarea, select';
  document.querySelectorAll(selector).forEach((el) => {
    const field = el;
    const style = getComputedStyle(field);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return;
    }
    const uniqueSelector = getUniqueSelector(field);
    const fieldDescription = analyzeField(field);
    fields.push({
      selector: uniqueSelector,
      description: fieldDescription
    });
  });
  return fields;
}
function fillForm(data) {
  for (const selector in data) {
    const element = document.querySelector(selector);
    if (element) {
      const value = data[selector];
      let filled = false;
      if (element.tagName.toLowerCase() === "select") {
        const select = element;
        for (let option of select.options) {
          if (option.text.toLowerCase().includes(value.toLowerCase()) || option.value.toLowerCase().includes(value.toLowerCase())) {
            select.selectedIndex = option.index;
            filled = true;
            break;
          }
        }
      } else if (element.type === "checkbox" || element.type === "radio") {
        const inputElement = element;
        const shouldCheck = value.toLowerCase() === "true" || value.toLowerCase() === "yes" || value.toLowerCase() === "1" || value.toLowerCase() === "on";
        inputElement.checked = shouldCheck;
        filled = true;
      } else {
        element.value = value;
        filled = true;
      }
      if (filled) {
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        element.style.outline = "2px solid yellow";
        setTimeout(() => {
          element.style.outline = "";
        }, 1e3);
      }
    }
  }
}
if (typeof window !== "undefined" && !window.browserAPI) {
  typeof chrome !== "undefined" && !!chrome.runtime;
  const isFirefox = typeof browser !== "undefined" && !!browser.runtime;
  const api = isFirefox ? browser : chrome;
  let browserName = "Chrome";
  if (navigator.userAgent.includes("Arc/")) browserName = "Arc";
  else if (navigator.userAgent.includes("Edg/")) browserName = "Edge";
  else if (navigator.userAgent.includes("Firefox/")) browserName = "Firefox";
  window.browserAPI = {
    name: browserName,
    runtime: {
      sendMessage: (message) => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.runtime.sendMessage(message).then(resolve).catch(reject);
            } else {
              api.runtime.sendMessage(message, (response) => {
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
        addListener: (callback) => api.runtime.onMessage.addListener(callback)
      }
    }
  };
}
(_a = window.browserAPI) == null ? void 0 : _a.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "start_fill") {
    (async () => {
      var _a2;
      console.log(`[EasyDaddy] Scanning page for forms (${((_a2 = window.browserAPI) == null ? void 0 : _a2.name) || "unknown"})...`);
      const pageContext = {
        url: location.href,
        title: document.title,
        fields: scanFields()
      };
      console.log("[EasyDaddy] Asking AI for autofill data...");
      try {
        const fillData = await window.browserAPI.runtime.sendMessage({
          type: "autofill",
          context: pageContext,
          profile: message.profile,
          instructions: message.instructions
        });
        console.log("[EasyDaddy] Received data from AI to fill:", fillData);
        if (fillData && !fillData.error && Object.keys(fillData).length > 0) {
          console.log("[EasyDaddy] Filling form...");
          fillForm(fillData);
          sendResponse({ success: true, fieldsFound: pageContext.fields.length, fieldsFilled: Object.keys(fillData).length });
        } else if (fillData == null ? void 0 : fillData.error) {
          console.error("[EasyDaddy] AI returned error:", fillData.error);
          sendResponse({ success: false, error: fillData.error });
        } else {
          console.log("[EasyDaddy] AI returned no data to fill, stopping.");
          sendResponse({ success: true, fieldsFound: pageContext.fields.length, fieldsFilled: 0 });
        }
      } catch (error) {
        console.error("[EasyDaddy] Error during form filling:", error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});
console.log(`[EasyDaddy] Content script loaded and ready (${((_b = window.browserAPI) == null ? void 0 : _b.name) || "unknown"}).`);
const bus = makeBus("content", {
  target: "background",
  handlers: {
    // Handlers for commands from popup/background
    ping() {
      return { status: "content script alive", url: window.location.href };
    }
  }
});
function extractFormData(form) {
  const data = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    if (typeof value === "string" && value.trim()) {
      data[key] = value.trim();
    }
  });
  const inputs = form.querySelectorAll("input, select, textarea");
  inputs.forEach((input) => {
    var _a2;
    const name = input.name || input.id || `field_${Math.random().toString(36).substr(2, 9)}`;
    const value = (_a2 = input.value) == null ? void 0 : _a2.trim();
    if (value && !data[name]) {
      data[name] = value;
    }
  });
  return data;
}
function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!form || form.tagName !== "FORM") return;
  try {
    const fields = extractFormData(form);
    if (Object.keys(fields).length === 0) return;
    const submissionData = {
      url: window.location.href,
      domain: getDomain(window.location.href),
      fields,
      formId: form.id || void 0,
      formClass: form.className || void 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    console.log("[EasyDaddy] Form submitted:", submissionData);
    const response = await bus.call("form/analyze", submissionData);
    if (response == null ? void 0 : response.shouldPromptSave) {
      showSavePrompt(response);
    }
  } catch (error) {
    console.error("[EasyDaddy] Error processing form submission:", error);
  }
});
function showSavePrompt(response) {
  const notification = document.createElement("div");
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
  notification.addEventListener("click", async () => {
    try {
      await bus.call("form/save", response.data);
      notification.style.background = "#2196F3";
      notification.innerHTML = '<div style="font-weight: bold;">✅ Saved to profile!</div>';
      setTimeout(() => notification.remove(), 2e3);
    } catch (error) {
      console.error("[EasyDaddy] Error saving form data:", error);
      notification.remove();
    }
  });
  document.body.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 1e4);
}
