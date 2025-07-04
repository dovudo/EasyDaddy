// Core profile types for the adaptive AI-driven system

export interface RawDocument {
  id: string;
  fileName: string;
  type: 'pdf' | 'txt' | 'md' | 'docx';
  content: string; // extracted text
  uploadDate: Date;
  size: number;
  language?: string;
}

export interface AdaptiveContext {
  id: string;
  name: string; // "Startup Pitch", "Academic Application", etc.
  description: string;
  trigger: string; // when to use this context
  template: Record<string, any>; // data structure for this context
  createdByAI: boolean;
  language: string;
  lastUsed?: Date;
}

export interface Profile {
  id: string;
  name: string;
  created: Date;
  updated: Date;
  
  // Raw uploaded documents
  rawDocuments: RawDocument[];
  
  // AI-generated adaptive structure
  aiStructure: {
    documentType: string; // 'cv', 'pitch_deck', 'portfolio', etc.
    personaTypes: string[]; // ["startup_founder", "researcher", "developer"]
    detectedLanguages: string[]; // ['en', 'es', 'fr']
    primaryLanguage: string; // 'en'
    dataPoints: Record<string, any>; // flexible structure
    narratives: Record<string, string>; // different "stories" for different use cases
    capabilities: string[]; // what the person can do
    contexts: AdaptiveContext[]; // AI-created contexts
  };
  
  // Cache for optimization
  fillHistory: FormFillHistory[];
}

export interface PageContext {
  url: string;
  title: string;
  domain: string;
  detectedLanguage: string; // 'en', 'es', 'fr', 'de', etc.
  fields: FormField[];
  siteContent: {
    headings: string[];
    descriptions: string[];
    labels: string[];
  };
}

export interface FormField {
  selector: string;
  type: string;
  label?: string;
  placeholder?: string;
  description?: string;
  detectedLanguage?: string; // field-specific language
  required: boolean;
  value?: string; // current value
}

export interface SiteAnalysis {
  siteType: string; // 'job_board', 'accelerator', 'freelance_platform', etc.
  formPurpose: string; // 'application', 'registration', 'survey', etc.
  targetLanguage: string;
  expectedTone: 'professional' | 'casual' | 'technical' | 'creative' | 'formal';
  culturalContext: string; // 'us', 'uk', 'eu', 'latam', 'asia'
  requiredPersona: string;
  fillStrategy: {
    priorityData: string[];
    languageAdaptations: {
      dateFormat: string;
      addressFormat: string;
      phoneFormat: string;
    };
    contentAdaptations: Record<string, any>;
  };
}

export interface FillStrategy {
  profileId: string;
  siteAnalysis: SiteAnalysis;
  selectedContext: AdaptiveContext;
  fieldMappings: Record<string, string>;
  generatedAt: Date;
}

export interface FormFillHistory {
  id: string;
  profileId: string;
  url: string;
  domain: string;
  timestamp: Date;
  fieldsCount: number;
  successfulFields: number;
  siteAnalysis: SiteAnalysis;
  strategy: FillStrategy;
  userFeedback?: 'positive' | 'negative' | 'neutral';
}

export interface DocumentAnalysisResult {
  documentType: string;
  personaTypes: string[];
  useCases: string[];
  detectedLanguages: string[];
  primaryLanguage: string;
  suggestedStructure: {
    core: Record<string, any>;
    contexts: Partial<AdaptiveContext>[];
  };
  extractedData: Record<string, any>;
}

export interface AIPromptConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

// Auto-save form data types
export interface FormSubmissionData {
  url: string;
  domain: string;
  fields: Record<string, string>;
  formId?: string;
  formClass?: string;
  timestamp: string;
}

export interface ProfileSiteData {
  domain: string;
  url: string;
  fields: Record<string, string>;
  timestamp: string;
  lastUsed?: string;
  useCount?: number;
}

export interface AutoSaveRequest {
  type: 'FORM_SUBMITTED';
  data: FormSubmissionData;
}

export interface AutoSaveResponse {
  shouldSave: boolean;
  newFields: Record<string, string>;
  conflictFields: Record<string, { old: string; new: string }>;
}

export interface ProfileWithSites extends ProfileData {
  sites?: ProfileSiteData[];
} 