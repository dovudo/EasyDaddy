// Enhanced EasyDaddy Background Service Worker
// Cross-browser compatible with Safari iOS, Arc, Firefox Focus, Chrome/Edge

import { 
  UniversalIPC, 
  IPCMessage, 
  FormScanRequest, 
  FormFillRequest,
  MessageTypes,
  BrowserCapabilities 
} from './shared/ipc.js';
import { CONFIG, buildModelConfig } from './lib/llm-config.js';
import { getActiveProfileId, getProfile, saveProfile } from './lib/storage.js';
import type { FormSubmissionData, ProfileSiteData, AutoSaveResponse } from './lib/types';

// Enhanced AI prompts for better cross-browser form understanding
const ENHANCED_AUTOFILL_PROMPT = `You are FormAutoFiller_v4, an expert at cross-browser web form autofill.

BROWSER_CONTEXT: You will receive browser/platform information to optimize filling strategy.
FORM_CONTEXT: Comprehensive field analysis with enhanced context clues.
USER_PROFILE: Structured profile data with categorized information.

CROSS-BROWSER COMPATIBILITY RULES:
1. Safari iOS: Use exact text matches, avoid complex selectors
2. Firefox Focus: Prefer simple form interactions 
3. Arc Browser: Support Little Arc window constraints
4. Chrome/Edge: Full feature support

FIELD MAPPING STRATEGY:
- Text inputs: Return string values
- Dropdowns: Use EXACT option text from available options
- Checkboxes: Return "true"/"false" 
- Radio buttons: Return "true" for selected option only
- Numbers: Return numeric strings

IMPORTANT: Return ONLY the CSS selectors provided in ALLOWED_SELECTORS as keys.
Do not add any other selectors. If no appropriate data exists, omit the selector.

For required fields, try harder to find appropriate data or reasonable defaults.
For optional fields, only fill if you have high-confidence data.

Return ONLY a JSON object with selector-value pairs.`;

class EasyDaddyServiceWorker {
  private ipc: UniversalIPC;
  private capabilities: BrowserCapabilities;
  
  constructor() {
    this.ipc = new UniversalIPC();
    this.capabilities = this.ipc.browserCapabilities;
    
    this.setupMessageHandlers();
    this.setupContextMenus();
    this.setupKeyboardShortcuts();
    this.setupSafariIntegration();
    this.setupTabNavigation();
    
    console.log(`[EasyDaddy SW] Initialized for ${this.capabilities.name} ${this.capabilities.version} on ${this.capabilities.platform}`);
  }
  
  private setupMessageHandlers() {
    // Legacy chrome.runtime.onMessage support
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: IPCMessage, sender, sendResponse) => {
        this.handleMessage(message, sender).then(sendResponse).catch(error => {
          console.error('[EasyDaddy SW] Message error:', error);
          sendResponse({ error: error.message });
        });
        return true; // Async response
      });
    }
    
    // Enhanced IPC handlers
    this.ipc.onMessage(MessageTypes.FORM_SCAN, this.handleFormScan.bind(this));
    this.ipc.onMessage(MessageTypes.FORM_FILL, this.handleFormFill.bind(this));
    this.ipc.onMessage(MessageTypes.PROFILE_EXTRACT, this.handleProfileExtract.bind(this));
    this.ipc.onMessage(MessageTypes.FORM_SUBMITTED, this.handleFormSubmission.bind(this));
    
    // Legacy compatibility
    this.ipc.onMessage(MessageTypes.START_FILL, this.handleLegacyFill.bind(this));
    this.ipc.onMessage(MessageTypes.AUTOFILL, this.handleLegacyAutofill.bind(this));
    this.ipc.onMessage(MessageTypes.EXTRACT_PROFILE, this.handleLegacyExtract.bind(this));
  }
  
  private async handleMessage(message: IPCMessage, sender: any): Promise<any> {
    console.log(`[EasyDaddy SW] Message: ${message.type}`, { 
      type: message.type, 
      browser: this.capabilities.name,
      platform: this.capabilities.platform 
    });
    
    try {
      switch (message.type) {
        case MessageTypes.FORM_SCAN:
          return await this.handleFormScan(message as FormScanRequest, sender);
        
        case MessageTypes.FORM_FILL:
          return await this.handleFormFill(message as FormFillRequest, sender);
        
        case MessageTypes.PROFILE_EXTRACT:
          return await this.handleProfileExtract(message, sender);
        
        case MessageTypes.FORM_SUBMITTED:
          return await this.handleFormSubmission(message, sender);
          
        // Legacy compatibility
        case MessageTypes.START_FILL:
          return await this.handleLegacyFill(message, sender);
          
        case MessageTypes.AUTOFILL:
          return await this.handleLegacyAutofill(message, sender);
          
        case MessageTypes.EXTRACT_PROFILE:
          return await this.handleLegacyExtract(message, sender);
        
        default:
          return { error: `Unknown message type: ${message.type}` };
      }
    } catch (error) {
      console.error(`[EasyDaddy SW] Error handling ${message.type}:`, error);
      return { error: error.message };
    }
  }
  
  private async handleFormScan(request: FormScanRequest, sender: any) {
    try {
      const tab = await this.getActiveTab();
      if (!tab?.id) throw new Error('No active tab');
      
      const response = await this.sendToTab(tab.id, {
        type: MessageTypes.FORM_SCAN,
        payload: request.payload
      });
      
      return { success: true, ...response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private async handleFormFill(request: FormFillRequest, sender: any) {
    try {
      const profileId = request.payload.profileId || await getActiveProfileId();
      if (!profileId) throw new Error('No active profile');
      
      const profile = await getProfile(profileId);
      if (!profile) throw new Error('Profile not found');
      
      const tab = await this.getActiveTab();
      if (!tab?.id) throw new Error('No active tab');
      
      // Get page context with enhanced browser detection
      const pageContext = await this.sendToTab(tab.id, {
        type: MessageTypes.GET_PAGE_CONTEXT
      });
      
      if (!pageContext?.fields || pageContext.fields.length === 0) {
        throw new Error('No fillable fields found on page');
      }
      
      // Generate fill data via AI with browser-specific optimizations
      const fillData = await this.generateFillData(pageContext, profile, request.payload.instructions);
      
      // Apply to page with browser-specific handling
      const fillResult = await this.sendToTab(tab.id, {
        type: MessageTypes.FILL_FORMS,
        payload: { 
          fillData, 
          testMode: request.payload.testMode,
          browserOptimizations: this.getBrowserOptimizations()
        }
      });
      
      return { 
        success: true, 
        ...fillResult,
        browserInfo: `${this.capabilities.name} ${this.capabilities.platform}`,
        profileUsed: profileId
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private getBrowserOptimizations() {
    return {
      slowTyping: this.capabilities.name === 'Safari' && this.capabilities.platform === 'iOS',
      useReactEvents: true,
      highlightFields: this.capabilities.name !== 'Firefox',
      respectCSP: this.capabilities.name === 'Safari',
      useNativeEvents: this.capabilities.name === 'Firefox'
    };
  }
  
  private async generateFillData(pageContext: any, profile: any, instructions?: string): Promise<any> {
    const config = buildModelConfig();
    
    // Extract allowed selectors for strict validation
    const allowedSelectors = (pageContext.fields || [])
      .map((f: any) => f.selector)
      .filter(Boolean);
    
    const enhancedPrompt = `${ENHANCED_AUTOFILL_PROMPT}

BROWSER_CONTEXT:
- Name: ${this.capabilities.name}
- Platform: ${this.capabilities.platform}
- Version: ${this.capabilities.version}
- Supports: ${JSON.stringify(this.capabilities.supports)}

ALLOWED_SELECTORS:
${allowedSelectors.map(s => `"${s}"`).join('\n')}

PAGE_CONTEXT:
${JSON.stringify(pageContext, null, 2)}

USER_PROFILE:
${JSON.stringify(profile, null, 2)}

INSTRUCTIONS: ${instructions || 'None'}

Return ONLY a JSON object with selector-value pairs:`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
    
    // Add OpenRouter-specific headers
    if (config.baseUrl.includes('openrouter.ai')) {
      headers['HTTP-Referer'] = CONFIG.siteUrl;
      headers['X-Title'] = CONFIG.siteName;
    }
    
    const requestBody: any = {
      model: config.model,
      messages: [{ role: 'user', content: enhancedPrompt }],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };
    
    // Add JSON mode if supported
    if (config.supportsJsonMode) {
      requestBody.response_format = { type: "json_object" };
    }
    
    const response = await fetch(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI request failed: ${response.status} - ${errorBody}`);
    }
    
    const data = await response.json();
    const fillData = JSON.parse(data.choices[0].message.content);
    
    // Validate selectors against allowed list
    const validatedData: Record<string, string> = {};
    for (const [selector, value] of Object.entries(fillData)) {
      if (allowedSelectors.includes(selector)) {
        validatedData[selector] = value as string;
      } else {
        console.warn(`[EasyDaddy SW] Ignoring invalid selector: ${selector}`);
      }
    }
    
    console.log(`[EasyDaddy SW] Generated fill data for ${Object.keys(validatedData).length} fields`);
    return validatedData;
  }
  
  private async handleProfileExtract(message: any, sender: any) {
    try {
      const config = buildModelConfig();
      
      const extractPrompt = `You are DataExtractor_v3 with enhanced cross-browser support.

Extract structured information from the following document and organize it according to the comprehensive profile schema.

BROWSER_CONTEXT: ${this.capabilities.name} ${this.capabilities.platform}

EXTRACTION_RULES:
1. Only include explicitly stated information
2. Use "..." for missing fields
3. Preserve original formatting where relevant
4. Extract all contact information, experience, education, skills
5. Create appropriate narratives for different contexts

Return ONLY a valid JSON object following the profile schema.

DOCUMENT_TEXT:
${message.payload?.text || message.text}`;

      const response = await fetch(config.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          ...(config.baseUrl.includes('openrouter.ai') && {
            'HTTP-Referer': CONFIG.siteUrl,
            'X-Title': CONFIG.siteName
          })
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: extractPrompt }],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          ...(config.supportsJsonMode && { response_format: { type: "json_object" } })
        })
      });
      
      const data = await response.json();
      const extractedData = JSON.parse(data.choices[0].message.content);
      
      console.log('[EasyDaddy SW] Profile extracted successfully');
      return extractedData;
    } catch (error) {
      console.error('[EasyDaddy SW] Profile extraction error:', error);
      return { error: error.message };
    }
  }
  
  private async handleFormSubmission(message: any, sender: any) {
    try {
      const submissionData: FormSubmissionData = message.payload || message;
      
      const activeProfileId = await getActiveProfileId();
      if (!activeProfileId) {
        return { shouldSave: false, message: 'No active profile' };
      }
      
      const currentProfile = await getProfile(activeProfileId) || {};
      const existingSites = currentProfile.sites || [];
      
      // Find existing site data
      const existingSite = existingSites.find((site: ProfileSiteData) => 
        site.domain === submissionData.domain
      );
      
      // Analyze changes
      const existingFields = existingSite?.fields || {};
      const newFields: Record<string, string> = {};
      const conflictFields: Record<string, { old: string; new: string }> = {};
      
      for (const [key, value] of Object.entries(submissionData.fields)) {
        if (!(key in existingFields)) {
          newFields[key] = value;
        } else if (existingFields[key] !== value) {
          conflictFields[key] = {
            old: existingFields[key],
            new: value
          };
        }
      }
      
      const hasNewData = Object.keys(newFields).length > 0 || Object.keys(conflictFields).length > 0;
      
      if (hasNewData) {
        // Auto-save new data
        let siteData = existingSite;
        if (!siteData) {
          siteData = {
            domain: submissionData.domain,
            url: submissionData.url,
            fields: {},
            timestamp: submissionData.timestamp,
            useCount: 0
          };
          existingSites.push(siteData);
        }
        
        // Merge fields
        siteData.fields = { ...siteData.fields, ...submissionData.fields };
        siteData.lastUsed = submissionData.timestamp;
        siteData.useCount = (siteData.useCount || 0) + 1;
        
        // Update profile
        await saveProfile(activeProfileId, {
          ...currentProfile,
          sites: existingSites
        });
        
        console.log(`[EasyDaddy SW] Auto-saved ${Object.keys(newFields).length} new fields for ${submissionData.domain}`);
      }
      
      return {
        shouldSave: hasNewData,
        newFields,
        conflictFields,
        autoSaved: hasNewData
      };
    } catch (error) {
      console.error('[EasyDaddy SW] Form submission error:', error);
      return { error: error.message };
    }
  }
  
  // Legacy compatibility handlers
  private async handleLegacyFill(message: any, sender: any) {
    return this.handleFormFill({
      type: MessageTypes.FORM_FILL,
      payload: {
        profileId: message.profileId || '',
        instructions: message.instructions,
        testMode: false
      }
    }, sender);
  }
  
  private async handleLegacyAutofill(message: any, sender: any) {
    const { context, profile, instructions } = message;
    return this.generateFillData(context, profile, instructions);
  }
  
  private async handleLegacyExtract(message: any, sender: any) {
    return this.handleProfileExtract({
      type: MessageTypes.PROFILE_EXTRACT,
      payload: { text: message.text }
    }, sender);
  }
  
  private setupContextMenus() {
    if (!this.capabilities.supports.contextMenu) {
      console.log('[EasyDaddy SW] Context menus not supported on this platform');
      return;
    }
    
    try {
      chrome.contextMenus.create({
        id: 'easydaddy-fill',
        title: 'EasyDaddy - Fill Forms',
        contexts: ['page', 'frame'],
        documentUrlPatterns: ['http://*/*', 'https://*/*']
      });
      
      chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        if (info.menuItemId === 'easydaddy-fill' && tab?.id) {
          await this.handleFormFill({
            type: MessageTypes.FORM_FILL,
            payload: { profileId: '' }
          } as FormFillRequest, { tab });
        }
      });
      
      console.log('[EasyDaddy SW] Context menus initialized');
    } catch (error) {
      console.warn('[EasyDaddy SW] Context menu setup failed:', error);
    }
  }
  
  private setupKeyboardShortcuts() {
    if (!this.capabilities.supports.shortcuts) {
      console.log('[EasyDaddy SW] Keyboard shortcuts not supported on this platform');
      return;
    }
    
    try {
      chrome.commands.onCommand.addListener(async (command) => {
        console.log(`[EasyDaddy SW] Keyboard command: ${command}`);
        
        switch (command) {
          case 'fill-forms':
            const tab = await this.getActiveTab();
            if (tab?.id) {
              await this.handleFormFill({
                type: MessageTypes.FORM_FILL,
                payload: { profileId: '' }
              } as FormFillRequest, { tab });
            }
            break;
            
          case 'open-popup':
            if (chrome.action?.openPopup) {
              chrome.action.openPopup();
            }
            break;
        }
      });
      
      console.log('[EasyDaddy SW] Keyboard shortcuts initialized');
    } catch (error) {
      console.warn('[EasyDaddy SW] Keyboard shortcuts setup failed:', error);
    }
  }
  
  private setupSafariIntegration() {
    if (this.capabilities.name !== 'Safari') return;
    
    console.log('[EasyDaddy SW] Safari integration enabled');
    
    // Setup WebKit message handlers for iOS
    if (this.capabilities.supports.webkitMessages) {
      console.log('[EasyDaddy SW] Safari iOS WebKit bridge ready');
    }
  }
  
  private setupTabNavigation() {
    // Handle tab updates for dynamic content
    if (chrome.tabs?.onUpdated) {
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
          console.log(`[EasyDaddy SW] Page loaded: ${tab.url}`);
          // Could pre-scan forms here for better performance
        }
      });
    }
  }
  
  private async getActiveTab() {
    if (this.capabilities.name === 'Safari' && this.capabilities.supports.webkitMessages) {
      // Safari iOS tab handling
      return { id: 1, url: 'about:blank' }; // Safari iOS has different tab model
    }
    
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
  
  private async sendToTab(tabId: number, message: any): Promise<any> {
    if (this.capabilities.name === 'Safari' && this.capabilities.supports.webkitMessages) {
      // Use WebKit bridge for Safari iOS
      return webkit.messageHandlers.tabs?.postMessage({
        action: 'sendMessage',
        tabId,
        message
      });
    }
    
    return chrome.tabs.sendMessage(tabId, message);
  }
}

// Initialize service worker
console.log('[EasyDaddy SW] Starting enhanced service worker...');
const serviceWorker = new EasyDaddyServiceWorker();

// Export for testing
if (typeof globalThis !== 'undefined') {
  globalThis.EasyDaddyServiceWorker = serviceWorker;
} 