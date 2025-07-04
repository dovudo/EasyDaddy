function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.oncomplete = request.onsuccess = () => resolve(request.result);
    request.onabort = request.onerror = () => reject(request.error);
  });
}
function createStore(dbName, storeName) {
  let dbp;
  const getDB = () => {
    if (dbp)
      return dbp;
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    dbp = promisifyRequest(request);
    dbp.then((db) => {
      db.onclose = () => dbp = void 0;
    }, () => {
    });
    return dbp;
  };
  return (txMode, callback) => getDB().then((db) => callback(db.transaction(storeName, txMode).objectStore(storeName)));
}
let defaultGetStoreFunc;
function defaultGetStore() {
  if (!defaultGetStoreFunc) {
    defaultGetStoreFunc = createStore("keyval-store", "keyval");
  }
  return defaultGetStoreFunc;
}
function get(key, customStore = defaultGetStore()) {
  return customStore("readonly", (store2) => promisifyRequest(store2.get(key)));
}
function set(key, value, customStore = defaultGetStore()) {
  return customStore("readwrite", (store2) => {
    store2.put(value, key);
    return promisifyRequest(store2.transaction);
  });
}
function del(key, customStore = defaultGetStore()) {
  return customStore("readwrite", (store2) => {
    store2.delete(key);
    return promisifyRequest(store2.transaction);
  });
}
function eachCursor(store2, callback) {
  store2.openCursor().onsuccess = function() {
    if (!this.result)
      return;
    callback(this.result);
    this.result.continue();
  };
  return promisifyRequest(store2.transaction);
}
function keys(customStore = defaultGetStore()) {
  return customStore("readonly", (store2) => {
    if (store2.getAllKeys) {
      return promisifyRequest(store2.getAllKeys());
    }
    const items = [];
    return eachCursor(store2, (cursor) => items.push(cursor.key)).then(() => items);
  });
}
const store = createStore("EasyDaddy-DB", "keyval-store");
const PROFILE_PREFIX = "profile-";
const META_PREFIX = "meta-";
const ACTIVE_PROFILE_ID_KEY = `${META_PREFIX}active-profile-id`;
async function initStorage() {
  try {
    await get("__init", store);
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
async function listProfiles() {
  const allKeys = await keys(store);
  return allKeys.filter((k) => typeof k === "string" && k.startsWith(PROFILE_PREFIX)).map((k) => ({ id: k.substring(PROFILE_PREFIX.length) }));
}
async function getProfile(id) {
  if (!id) return null;
  return get(`${PROFILE_PREFIX}${id}`, store);
}
async function saveProfile(id, data) {
  return set(`${PROFILE_PREFIX}${id}`, data, store);
}
async function deleteProfile(id) {
  return del(`${PROFILE_PREFIX}${id}`, store);
}
async function getActiveProfileId() {
  const activeId = await get(ACTIVE_PROFILE_ID_KEY, store);
  return typeof activeId === "string" ? activeId : null;
}
async function setActiveProfileId(id) {
  return set(ACTIVE_PROFILE_ID_KEY, id, store);
}
function createBrowserAPI() {
  const isChrome = typeof chrome !== "undefined" && !!chrome.runtime;
  const isFirefox = typeof browser !== "undefined" && !!browser.runtime;
  let browserName = "unknown";
  let browserVersion = "unknown";
  if (isChrome) {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Arc/")) {
      browserName = "Arc";
      const match = userAgent.match(/Arc\/([\d.]+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (userAgent.includes("Edg/")) {
      browserName = "Edge";
      const match = userAgent.match(/Edg\/([\d.]+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (userAgent.includes("OPR/")) {
      browserName = "Opera";
      const match = userAgent.match(/OPR\/([\d.]+)/);
      browserVersion = match ? match[1] : "unknown";
    } else if (userAgent.includes("Chrome/")) {
      browserName = "Chrome";
      const match = userAgent.match(/Chrome\/([\d.]+)/);
      browserVersion = match ? match[1] : "unknown";
    }
  } else if (isFirefox) {
    browserName = "Firefox";
    const match = navigator.userAgent.match(/Firefox\/([\d.]+)/);
    browserVersion = match ? match[1] : "unknown";
  }
  console.log(`[EasyDaddy] Detected browser: ${browserName} ${browserVersion}`);
  const api = isFirefox ? browser : chrome;
  const promisifiedAPI = {
    name: browserName,
    version: browserVersion,
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
        addListener: (callback) => {
          api.runtime.onMessage.addListener(callback);
        }
      },
      getURL: (path) => {
        return api.runtime.getURL(path);
      },
      get lastError() {
        return api.runtime.lastError;
      }
    },
    tabs: {
      query: (queryInfo) => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.tabs.query(queryInfo).then(resolve).catch(reject);
            } else {
              api.tabs.query(queryInfo, (tabs) => {
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
      sendMessage: (tabId, message) => {
        return new Promise((resolve, reject) => {
          try {
            if (isFirefox) {
              api.tabs.sendMessage(tabId, message).then(resolve).catch(reject);
            } else {
              api.tabs.sendMessage(tabId, message, (response) => {
                if (api.runtime.lastError) {
                  const errorMsg = api.runtime.lastError.message || "";
                  if (errorMsg.includes("Could not establish connection") || errorMsg.includes("receiving end does not exist")) {
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
        get: (keys2) => {
          return new Promise((resolve, reject) => {
            try {
              if (isFirefox) {
                api.storage.local.get(keys2).then(resolve).catch(reject);
              } else {
                api.storage.local.get(keys2, (result) => {
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
        set: (items) => {
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
        remove: (keys2) => {
          return new Promise((resolve, reject) => {
            try {
              if (isFirefox) {
                api.storage.local.remove(keys2).then(resolve).catch(reject);
              } else {
                api.storage.local.remove(keys2, () => {
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
const browserAPI = createBrowserAPI();
function handleBrowserError(error, context) {
  const errorMsg = (error == null ? void 0 : error.message) || (error == null ? void 0 : error.toString()) || "Unknown error";
  console.error(`[EasyDaddy] ${context} error in ${browserAPI.name}:`, error);
  if (browserAPI.name === "Arc") {
    if (errorMsg.includes("Could not establish connection")) {
      return "Не удалось подключиться к странице. В Arc браузере попробуйте:\n• Перезагрузить вкладку\n• Отключить и включить расширение\n• Проверить разрешения расширения";
    }
  }
  if (errorMsg.includes("Could not establish connection") || errorMsg.includes("receiving end does not exist")) {
    return "Не удалось подключиться к странице. Пожалуйста:\n• Перезагрузите вкладку\n• Попробуйте снова\n• Убедитесь, что страница полностью загружена";
  }
  if (errorMsg.includes("Extension context invalidated")) {
    return "Расширение было перезагружено. Пожалуйста, обновите страницу и попробуйте снова.";
  }
  return `Произошла ошибка: ${errorMsg}
Попробуйте перезагрузить страницу и повторить попытку.`;
}
function getBrowserCapabilities() {
  var _a;
  return {
    name: browserAPI.name,
    version: browserAPI.version,
    supportsManifestV3: typeof chrome !== "undefined" && !!((_a = chrome.runtime) == null ? void 0 : _a.getManifest),
    supportsServiceWorker: "serviceWorker" in navigator,
    supportsWebExtensions: typeof browser !== "undefined",
    supportsPDF: browserAPI.name === "Chrome" || browserAPI.name === "Edge",
    isChromiumBased: ["Chrome", "Arc", "Edge", "Opera"].includes(browserAPI.name)
  };
}
function isSafariBrowser() {
  const ua = navigator.userAgent;
  const isSafariUA = /Safari\//.test(ua) && !/Chrome|Chromium|Android/.test(ua);
  const hasSafariObj = typeof window !== "undefined" && typeof window.safari !== "undefined";
  return isSafariUA || hasSafariObj;
}
export {
  initStorage as a,
  getActiveProfileId as b,
  getProfile as c,
  saveProfile as d,
  deleteProfile as e,
  browserAPI as f,
  getBrowserCapabilities as g,
  handleBrowserError as h,
  isSafariBrowser as i,
  listProfiles as l,
  setActiveProfileId as s
};
