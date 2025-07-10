// Universal IPC types for cross-browser messaging
export interface IPCMessage {
  type: string;
  payload?: any;
  requestId?: string;
  source?: 'popup' | 'background' | 'content' | 'injection';
  target?: 'popup' | 'background' | 'content' | 'injection';
  timestamp?: number;
}

export interface FormScanRequest extends IPCMessage {
  type: 'FORM_SCAN';
  payload: {
    includeHidden?: boolean;
    selector?: string;
  };
}

export interface FormFillRequest extends IPCMessage {
  type: 'FORM_FILL';
  payload: {
    profileId: string;
    instructions?: string;
    testMode?: boolean;
  };
}

export interface ProfileExtractRequest extends IPCMessage {
  type: 'PROFILE_EXTRACT';
  payload: {
    text: string;
    fileName?: string;
    language?: string;
  };
}

// Response types
export interface FormScanResponse {
  success: boolean;
  fields: FormField[];
  error?: string;
}

export interface FormFillResponse {
  success: boolean;
  fieldsFound: number;
  fieldsFilled: number;
  error?: string;
  details?: string[];
}

// Enhanced form field detection
export interface FormField {
  selector: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'number' | 'password';
  description: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  value?: string;
  options?: string[]; // for select/radio
  attributes: Record<string, string>;
  rect?: DOMRect; // element position for Safari iOS
}

// Cross-browser capability detection
export interface BrowserCapabilities {
  name: 'Safari' | 'Chrome' | 'Firefox' | 'Arc' | 'Edge';
  version: string;
  platform: 'iOS' | 'macOS' | 'Windows' | 'Android' | 'Linux';
  supports: {
    popup: boolean;
    contextMenu: boolean;
    shortcuts: boolean;
    scripting: boolean;
    pdfProcessing: boolean;
    dynamicImports: boolean;
    webkitMessages: boolean;
  };
}

// Safari-specific types
export interface SafariExtensionContext {
  isViewController: boolean;
  presentationMode: 'sheet' | 'popup' | 'tab';
  device: 'iPhone' | 'iPad' | 'Mac';
}

// Universal IPC handler
export class UniversalIPC {
  private browserAPI: any;
  private capabilities: BrowserCapabilities;
  private messageHandlers: Map<string, Function> = new Map();
  
  constructor() {
    this.browserAPI = this.detectBrowserAPI();
    this.capabilities = this.detectCapabilities();
    this.setupMessageListeners();
  }
  
  private detectBrowserAPI() {
    // Detect browser environment
    if (typeof browser !== 'undefined' && browser?.runtime) {
      return browser; // Firefox
    }
    if (typeof chrome !== 'undefined' && chrome?.runtime) {
      return chrome; // Chrome, Arc, Edge
    }
    if (typeof webkit !== 'undefined' && webkit?.messageHandlers) {
      return this.createSafariAPI(); // Safari iOS
    }
    
    // Fallback for content scripts
    return this.createFallbackAPI();
  }
  
  private createSafariAPI() {
    // Safari iOS bridge
    return {
      runtime: {
        sendMessage: async (message: any) => {
          return new Promise((resolve, reject) => {
            try {
              const messageId = Math.random().toString(36).substring(2);
              
              // Listen for response
              const responseHandler = (event: CustomEvent) => {
                if (event.detail.messageId === messageId) {
                  window.removeEventListener(`safari_response_${messageId}`, responseHandler);
                  resolve(event.detail.response);
                }
              };
              
              window.addEventListener(`safari_response_${messageId}`, responseHandler);
              
              // Send message via WebKit bridge
              webkit.messageHandlers.background?.postMessage({
                ...message,
                messageId
              });
              
              // Timeout after 30 seconds
              setTimeout(() => {
                window.removeEventListener(`safari_response_${messageId}`, responseHandler);
                reject(new Error('Safari message timeout'));
              }, 30000);
              
            } catch (error) {
              reject(error);
            }
          });
        },
        onMessage: {
          addListener: (callback: any) => {
            window.addEventListener('safari_message', (event: CustomEvent) => {
              const { message, sender, messageId } = event.detail;
              callback(message, sender, (response: any) => {
                window.dispatchEvent(new CustomEvent(`safari_response_${messageId}`, {
                  detail: { response, messageId }
                }));
              });
            });
          }
        }
      },
      tabs: {
        query: async (queryInfo: any) => {
          return webkit.messageHandlers.tabs?.postMessage({ 
            action: 'query', 
            queryInfo 
          }) || [];
        },
        sendMessage: async (tabId: number, message: any) => {
          return webkit.messageHandlers.tabs?.postMessage({ 
            action: 'sendMessage', 
            tabId, 
            message 
          });
        }
      }
    };
  }
  
  private createFallbackAPI() {
    // Fallback for environments without extension APIs
    return {
      runtime: {
        sendMessage: async (message: any) => {
          // Use window.postMessage as fallback
          return new Promise((resolve) => {
            const messageId = Math.random().toString(36).substring(2);
            
            const responseHandler = (event: MessageEvent) => {
              if (event.data?.type === 'EASYDADDY_RESPONSE' && event.data?.messageId === messageId) {
                window.removeEventListener('message', responseHandler);
                resolve(event.data.response);
              }
            };
            
            window.addEventListener('message', responseHandler);
            window.postMessage({
              type: 'EASYDADDY_MESSAGE',
              message,
              messageId
            }, '*');
            
            // Timeout
            setTimeout(() => {
              window.removeEventListener('message', responseHandler);
              resolve({ error: 'Fallback timeout' });
            }, 5000);
          });
        },
        onMessage: {
          addListener: (callback: any) => {
            window.addEventListener('message', (event: MessageEvent) => {
              if (event.data?.type === 'EASYDADDY_MESSAGE') {
                callback(event.data.message, {}, (response: any) => {
                  window.postMessage({
                    type: 'EASYDADDY_RESPONSE',
                    response,
                    messageId: event.data.messageId
                  }, '*');
                });
              }
            });
          }
        }
      }
    };
  }
  
  private setupMessageListeners() {
    this.browserAPI.runtime?.onMessage?.addListener((message: IPCMessage, sender: any, sendResponse: any) => {
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        const result = handler(message, sender);
        if (result instanceof Promise) {
          result.then(sendResponse);
          return true; // Async response
        } else {
          sendResponse(result);
        }
      }
      return false;
    });
  }
  
  async sendMessage(message: IPCMessage): Promise<any> {
    const enhancedMessage = {
      ...message,
      timestamp: Date.now(),
      capabilities: this.capabilities
    };
    
    try {
      if (this.capabilities.name === 'Safari' && this.capabilities.supports.webkitMessages) {
        return await this.handleSafariMessage(enhancedMessage);
      }
      
      return await this.browserAPI.runtime.sendMessage(enhancedMessage);
    } catch (error) {
      console.error('[EasyDaddy IPC] Message failed:', error);
      throw error;
    }
  }
  
  private async handleSafariMessage(message: IPCMessage): Promise<any> {
    // Safari iOS specific handling
    if (message.type === 'FORM_FILL') {
      // Use WebKit bridge for form operations
      return webkit.messageHandlers.formFill?.postMessage(message.payload);
    }
    
    return this.browserAPI.runtime.sendMessage(message);
  }
  
  onMessage(type: string, handler: Function) {
    this.messageHandlers.set(type, handler);
  }
  
  private detectCapabilities(): BrowserCapabilities {
    const ua = navigator.userAgent;
    let name: BrowserCapabilities['name'] = 'Chrome';
    let platform: BrowserCapabilities['platform'] = 'Windows';
    
    // Browser detection
    if (ua.includes('iPhone') || ua.includes('iPad')) {
      name = 'Safari';
      platform = ua.includes('iPhone') ? 'iOS' : 'iOS';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      name = 'Safari';
      platform = 'macOS';
    } else if (ua.includes('Arc/')) {
      name = 'Arc';
      platform = 'macOS';
    } else if (ua.includes('Firefox')) {
      name = 'Firefox';
    } else if (ua.includes('Edg/')) {
      name = 'Edge';
    }
    
    // Platform detection
    if (ua.includes('Android')) platform = 'Android';
    else if (ua.includes('Windows')) platform = 'Windows';
    else if (ua.includes('Linux')) platform = 'Linux';
    else if (ua.includes('Mac')) platform = 'macOS';
    
    const version = this.extractVersion(ua, name);
    
    return {
      name,
      version,
      platform,
      supports: {
        popup: name !== 'Firefox' || !ua.includes('Focus'),
        contextMenu: name !== 'Safari' || platform !== 'iOS',
        shortcuts: platform !== 'iOS',
        scripting: true,
        pdfProcessing: name !== 'Firefox' && !(name === 'Safari' && platform === 'iOS'),
        dynamicImports: name !== 'Safari' || parseFloat(version) >= 15,
        webkitMessages: name === 'Safari' && typeof webkit !== 'undefined'
      }
    };
  }
  
  private extractVersion(ua: string, browser: string): string {
    const patterns = {
      Safari: /Version\/(\d+\.\d+)/,
      Chrome: /Chrome\/(\d+\.\d+)/,
      Firefox: /Firefox\/(\d+\.\d+)/,
      Arc: /Arc\/(\d+\.\d+)/,
      Edge: /Edg\/(\d+\.\d+)/
    };
    
    const match = ua.match(patterns[browser]);
    return match ? match[1] : '0.0';
  }
  
  get browserCapabilities(): BrowserCapabilities {
    return this.capabilities;
  }
}

// Global IPC instance
export const ipc = new UniversalIPC();

// Message type constants
export const MessageTypes = {
  FORM_SCAN: 'FORM_SCAN',
  FORM_FILL: 'FORM_FILL', 
  GET_PAGE_CONTEXT: 'GET_PAGE_CONTEXT',
  FILL_FORMS: 'FILL_FORMS',
  PROFILE_EXTRACT: 'PROFILE_EXTRACT',
  FORM_SUBMITTED: 'FORM_SUBMITTED',
  
  // Legacy compatibility
  START_FILL: 'start_fill',
  AUTOFILL: 'autofill',
  EXTRACT_PROFILE: 'extract_profile'
} as const; 