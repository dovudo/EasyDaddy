import { test, expect } from '@playwright/test';

// Utility to access shadow DOM
async function getShadowInput(page, selector) {
  return await page.evaluateHandle(sel => {
    const host = document.querySelector(sel);
    return host && host.shadowRoot && host.shadowRoot.querySelector('input');
  }, selector);
}

test.describe('EasyDaddy Autofill E2E', () => {
  test('fills all fields on test form', async ({ page }) => {
    await page.goto('http://localhost:5173/test-form.html'); // Adjust if needed

    // Имитация автозаполнения через content-script (или через UI, если popup доступен)
    // Здесь предполагается, что расширение уже установлено и активировано
    // Можно вызвать window.postMessage или IPC напрямую, если тестовая сборка

    // Пример: эмулируем автозаполнение через window.postMessage (если поддерживается)
    await page.evaluate(() => {
      window.postMessage({
        type: 'EASYDADDY_MESSAGE',
        message: {
          type: 'FORM_FILL',
          payload: {
            fillData: {
              '#firstName': 'TestName',
              '#lastName': 'TestLast',
              '#email': 'test@example.com',
              '#phone': '+1234567890',
              '#password': 'secret123',
              'select[name="country"]': 'USA',
              'input[name="gender"][value="male"]': 'true',
              'input[name="newsletter"]': 'true',
              '#bio': 'Test bio',
              '#shadowField': 'ShadowValue',
              '#iframeField': 'IframeValue'
            },
            testMode: false
          }
        },
        messageId: 'test-e2e'
      }, '*');
    });

    // Проверяем обычные поля
    await expect(page.locator('#firstName')).toHaveValue('TestName');
    await expect(page.locator('#lastName')).toHaveValue('TestLast');
    await expect(page.locator('#email')).toHaveValue('test@example.com');
    await expect(page.locator('#phone')).toHaveValue('+1234567890');
    await expect(page.locator('#password')).toHaveValue('secret123');
    await expect(page.locator('select[name="country"]')).toHaveValue('USA');
    await expect(page.locator('input[name="gender"][value="male"]')).toBeChecked();
    await expect(page.locator('input[name="newsletter"]')).toBeChecked();
    await expect(page.locator('#bio')).toHaveValue('Test bio');

    // Проверяем Shadow DOM
    const shadowInput = await getShadowInput(page, '#shadow-mount');
    expect(await shadowInput.evaluate((el: HTMLInputElement) => el.value)).toBe('ShadowValue');

    // Проверяем iframe
    const frame = await page.frameLocator('iframe');
    await expect(frame.locator('#iframeField')).toHaveValue('IframeValue');
  });
}); 