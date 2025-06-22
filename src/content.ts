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

function scanFields(): FieldInfo[] {
  const els: Element[] = Array.from(
    document.querySelectorAll('input,textarea,[contenteditable]')
  );
  const fields: FieldInfo[] = [];
  for (const el of els) {
    const selector = getSelector(el);
    if (!selector) continue;
    const labelEl = document.querySelector(`label[for="${(el as any).id}"]`);
    const label = labelEl ? labelEl.textContent?.trim() || '' : el.getAttribute('placeholder') || '';
    fields.push({ selector, label });
  }
  return fields;
}

async function fillForm(map: Record<string, string>) {
  for (const [selector, value] of Object.entries(map)) {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) {
      (el as any).value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      const prev = (el as HTMLElement).style.outline;
      (el as HTMLElement).style.outline = '2px solid #f4e7a1';
      setTimeout(() => {
        (el as HTMLElement).style.outline = prev;
      }, 1000);
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'start_fill') {
    (async () => {
      const context = {
        url: location.href,
        title: document.title,
        fields: scanFields(),
      };
      const map: Record<string, string> = await chrome.runtime.sendMessage({
        type: 'autofill',
        context,
        profile: msg.profile,
      });
      await fillForm(map);
    })();
  }
});
