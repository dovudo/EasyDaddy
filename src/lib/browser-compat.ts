// Universal Browser Compatibility Layer
// Provides unified API for Chrome, Arc, Firefox, Safari and other browsers

interface BrowserAPI {
  name: string;
  version: string;
  runtime: {
    sendMessage: (message: any) => Promise<any>;
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void | boolean) => void;
    };
    getURL: (path: string) => string;
    lastError: any;
  };
  tabs: {
    query: (queryInfo: any) => Promise<any[]>;
    sendMessage: (tabId: number, message: any) => Promise<any>;
  };
  storage: {
    local: {
      get: (keys?: string | string[] | null) => Promise<any>;
      set: (items: any) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  };
}

// Detect browser and create unified API
function createBrowserAPI(): BrowserAPI {
  const isChrome = typeof chrome !== 'undefined' && !!chrome.runtime;
  const isFirefox = typeof browser !== 'undefined' && !!browser.runtime;
  
  // Browser detection
  let browserName = 'unknown';
  let browserVersion = 'unknown';
  
  if (isChrome) {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Arc/')) {
      browserName = 'Arc';
      const match = userAgent.match(/Arc\/([\d.]+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Edg/')) {
      browserName = 'Edge';
      const match = userAgent.match(/Edg\/([\d.]+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('OPR/')) {
      browserName = 'Opera';
      const match = userAgent.match(/OPR\/([\d.]+)/);
      browserVersion = match ? match[1] : 'unknown';
    } else if (userAgent.includes('Chrome/')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : 'unknown';
    }
  } else if (isFirefox) {
    browserName = 'Firefox';
    const match = navigator.userAgent.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : 'unknown';
  }

  console.log(`[EasyDaddy] Detected browser: ${browserName} ${browserVersion}`);

  const api = isFirefox ? browser : chrome;

  // Promisify Chrome APIs if needed
  const promisifiedAPI: BrowserAPI = {
    name: browserName,
    version: browserVersion,
    runtime: {
      sendMessage: (message: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              // Firefox already returns promises
              api.runtime.sendMessage(message).then(resolve).catch(reject);
            } else {
              // Chrome uses callbacks
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
        addListener: (callback: (message: any, sender: any, sendResponse: any) => void | boolean) => {
          api.runtime.onMessage.addListener(callback);
        }
      },
      getURL: (path: string): string => {
        return api.runtime.getURL(path);
      },
      get lastError() {
        return api.runtime.lastError;
      }
    },
    tabs: {
      query: (queryInfo: any): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.tabs.query(queryInfo).then(resolve).catch(reject);
            } else {
              api.tabs.query(queryInfo, (tabs: any[]) => {
                if (api.runtime.lastError) {
                  reject(new Error(api.runtime.lastError.message));
                } else {
                  resolve(tabs);
                }
              });
            }
          } catch (error) {
            reject(error);
          }
        });
      },
      sendMessage: (tabId: number, message: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.tabs.sendMessage(tabId, message).then(resolve).catch(reject);
            } else {
              api.tabs.sendMessage(tabId, message, (response: any) => {
                if (api.runtime.lastError) {
                  // Some errors are expected (like tab not responding), don't reject for those
                  const errorMsg = api.runtime.lastError.message || '';
                  if (errorMsg.includes('Could not establish connection') || 
                      errorMsg.includes('receiving end does not exist')) {
                    resolve({ error: errorMsg, noConnection: true });
                  } else {
                    reject(new Error(errorMsg));
                  }
                } else {
                  resolve(response);
                }
              });
            }
          } catch (error) {
            reject(error);
          }
        });
      }
    },
    storage: {
      local: {
        get: (keys?: string | string[] | null): Promise<any> => {
          return new Promise((resolve, reject) => {
            try {
              if (isFirefox) {
                api.storage.local.get(keys).then(resolve).catch(reject);
              } else {
                api.storage.local.get(keys, (result: any) => {
                  if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                  } else {
                    resolve(result);
                  }
                });
              }
            } catch (error) {
              reject(error);
            }
          });
        },
        set: (items: any): Promise<void> => {
          return new Promise((resolve, reject) => {
            try {
              if (isFirefox) {
                api.storage.local.set(items).then(resolve).catch(reject);
              } else {
                api.storage.local.set(items, () => {
                  if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                  } else {
                    resolve();
                  }
                });
              }
            } catch (error) {
              reject(error);
            }
          });
        },
        remove: (keys: string | string[]): Promise<void> => {
          return new Promise((resolve, reject) => {
            try {
              if (isFirefox) {
                api.storage.local.remove(keys).then(resolve).catch(reject);
              } else {
                api.storage.local.remove(keys, () => {
                  if (api.runtime.lastError) {
                    reject(new Error(api.runtime.lastError.message));
                  } else {
                    resolve();
                  }
                });
              }
            } catch (error) {
              reject(error);
            }
          });
        }
      }
    }
  };

  return promisifiedAPI;
}

// Export singleton instance
export const browserAPI = createBrowserAPI();

// Enhanced error handling for different browsers
export function handleBrowserError(error: any, context: string): string {
  const errorMsg = error?.message || error?.toString() || 'Unknown error';
  
  console.error(`[EasyDaddy] ${context} error in ${browserAPI.name}:`, error);

  // Browser-specific error messages
  if (browserAPI.name === 'Arc') {
    if (errorMsg.includes('Could not establish connection')) {
      return 'Не удалось подключиться к странице. В Arc браузере попробуйте:\n• Перезагрузить вкладку\n• Отключить и включить расширение\n• Проверить разрешения расширения';
    }
  }
  
  if (errorMsg.includes('Could not establish connection') || 
      errorMsg.includes('receiving end does not exist')) {
    return 'Не удалось подключиться к странице. Пожалуйста:\n• Перезагрузите вкладку\n• Попробуйте снова\n• Убедитесь, что страница полностью загружена';
  }
  
  if (errorMsg.includes('Extension context invalidated')) {
    return 'Расширение было перезагружено. Пожалуйста, обновите страницу и попробуйте снова.';
  }
  
  return `Произошла ошибка: ${errorMsg}\nПопробуйте перезагрузить страницу и повторить попытку.`;
}

// Browser feature detection
export function getBrowserCapabilities() {
  return {
    name: browserAPI.name,
    version: browserAPI.version,
    supportsManifestV3: typeof chrome !== 'undefined' && !!chrome.runtime?.getManifest,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsWebExtensions: typeof browser !== 'undefined',
    supportsPDF: browserAPI.name === 'Chrome' || browserAPI.name === 'Edge',
    isChromiumBased: ['Chrome', 'Arc', 'Edge', 'Opera'].includes(browserAPI.name)
  };
}

// Safari detection
export function isSafariBrowser(): boolean {
  const ua = navigator.userAgent;
  // Safari on Mac/iOS: contains 'Safari' but not 'Chrome' or 'Chromium' or 'Android'
  const isSafariUA = /Safari\//.test(ua) && !/Chrome|Chromium|Android/.test(ua);
  // window.safari is defined only in Safari
  const hasSafariObj = typeof window !== 'undefined' && typeof (window as any).safari !== 'undefined';
  return isSafariUA || hasSafariObj;
} 