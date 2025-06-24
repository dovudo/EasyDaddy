import type { 
  DocumentAnalysisResult, 
  SiteAnalysis, 
  PageContext, 
  Profile,
  FormField,
  AIPromptConfig 
} from './types';
import { buildModelConfig, CONFIG } from './llm-config';

// AI Configuration using the new LLM config system
const AI_CONFIG: AIPromptConfig = {
  model: CONFIG.model,
  temperature: CONFIG.temperature,
  maxTokens: CONFIG.maxTokens,
  systemPrompt: 'You are an intelligent assistant specialized in document analysis and form filling.'
};

// AI Prompts with language awareness
const PROMPTS = {
  DOCUMENT_ANALYSIS: `
You are an expert at analyzing professional documents and extracting structured data.

Analyze this document and determine:

1. Document type and persona (CV, pitch deck, portfolio, resume, etc.)
2. Key roles/activities of the person
3. Use cases where this profile would be valuable
4. Optimal data structure for storage
5. Detected language(s) in the document

Return JSON:
{
  "documentType": "cv|pitch_deck|portfolio|resume|cover_letter|other",
  "personaTypes": ["startup_founder", "developer", "researcher", "designer"],
  "useCases": ["job_applications", "startup_accelerators", "freelance_platforms"],
  "detectedLanguages": ["en", "es", "fr"],
  "primaryLanguage": "en",
  "suggestedStructure": {
    "core": {
      "personal": {},
      "professional": {},
      "skills": {},
      "experience": {}
    },
    "contexts": [
      {
        "name": "Professional Applications",
        "description": "For job applications and professional networking",
        "trigger": "job applications, LinkedIn, professional networks",
        "template": {}
      }
    ]
  },
  "extractedData": {}
}`,

  FORM_CONTEXT_ANALYSIS: `
You are a web form analysis expert. Analyze this page and form context:

URL: {url}
Title: {title}
Domain: {domain}
Page Language: {detectedLanguage}
Form fields: {fields}
Page content: {siteContent}

Determine:
1. Site/service type and purpose
2. Form objective and context
3. Expected tone, style, and language for responses
4. Which profile information would be most relevant
5. Cultural/regional considerations for this market

Return JSON:
{
  "siteType": "job_board|accelerator|freelance_platform|university|government|ecommerce|other",
  "formPurpose": "application|registration|survey|contact|checkout|other",
  "targetLanguage": "en|es|fr|de|it|pt|ru|zh|ja|ko",
  "expectedTone": "professional|casual|technical|creative|formal",
  "culturalContext": "us|uk|eu|latam|asia|other",
  "requiredPersona": "professional|entrepreneur|student|freelancer|researcher",
  "fillStrategy": {
    "priorityData": ["personal_info", "experience", "skills", "education"],
    "languageAdaptations": {
      "dateFormat": "mm/dd/yyyy|dd/mm/yyyy|yyyy-mm-dd",
      "addressFormat": "us|uk|eu|international",
      "phoneFormat": "+1|+44|+33|+49|international"
    },
    "contentAdaptations": {}
  }
}`,

  CONTEXTUAL_FILL: `
You are an intelligent form-filling assistant. Generate appropriate responses for each form field.

Context:
- Site: {siteType} ({targetLanguage})
- Purpose: {formPurpose}
- Tone: {expectedTone}
- Cultural context: {culturalContext}

User Profile Data:
{profileData}

Form Fields to Fill:
{formFields}

Instructions:
1. Respond in {targetLanguage} language ONLY
2. Adapt content style to {expectedTone} tone
3. Use appropriate cultural references for {culturalContext}
4. Match field requirements (length, format, type)
5. Be authentic and consistent across fields
6. If information is missing, generate plausible content based on existing profile data
7. For dates, use the format: {dateFormat}
8. For phone numbers, use the format: {phoneFormat}
9. For addresses, use the format: {addressFormat}

Return JSON mapping each field selector to its response:
{
  "selector1": "response in target language",
  "selector2": "another response"
}`
};

// Language detection utility
function detectLanguage(text: string): string {
  // Simple language detection based on common words
  const patterns = {
    en: /\b(the|and|is|in|to|of|a|that|it|with|for|as|was|on|are|you)\b/gi,
    es: /\b(el|la|de|que|y|en|un|es|se|no|te|lo|le|da|su|por|son|con|para|las|del|los|una|como|pero|sus|por|como|hasta|desde|cuando|muy|sin|sobre|también|me|ya|todo|esta|estos|todas|uno|puede|tiempo|muy|cual|solo)\b/gi,
    fr: /\b(le|de|et|à|un|il|être|et|en|avoir|que|pour|dans|ce|son|une|sur|avec|ne|se|pas|tout|plus|pouvoir|par|je|son|que|si|nous|comme|mais|faire|leurs|mes|ou|homme|bien|au|du|peu|même|grand|nouveau|jour|haut|bon|bas|où|donc|entre|sous|contre|après|avant|sans|depuis|pendant|vers)\b/gi,
    de: /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch|wie|einem|über|einen|so|zum|war|haben|nur|oder|aber|vor|zur)\b/gi
  };

  let maxCount = 0;
  let detectedLang = 'en';

  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern);
    const count = matches ? matches.length : 0;
    if (count > maxCount) {
      maxCount = count;
      detectedLang = lang;
    }
  }

  return detectedLang;
}

// AI API call wrapper using the new LLM configuration
async function callAI(prompt: string, temperature = AI_CONFIG.temperature): Promise<any> {
  const config = buildModelConfig();
  
  const requestBody: any = {
    model: config.model,
    messages: [
      { role: 'system', content: AI_CONFIG.systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature,
    max_tokens: config.maxTokens
  };

  // Add JSON mode if supported
  if (config.supportsJsonMode) {
    requestBody.response_format = { type: 'json_object' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // Add OpenRouter-specific headers if using OpenRouter
  if (config.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = CONFIG.siteUrl;
    headers['X-Title'] = CONFIG.siteName;
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid AI API response format');
  }

  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.warn('AI response was not valid JSON, returning raw content:', content);
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }
}

// Export functions
export async function analyzeDocument(content: string): Promise<DocumentAnalysisResult> {
  const prompt = PROMPTS.DOCUMENT_ANALYSIS + '\n\nDocument content:\n' + content;
  return await callAI(prompt);
}

export async function analyzeFormContext(pageContext: PageContext): Promise<SiteAnalysis> {
  const prompt = PROMPTS.FORM_CONTEXT_ANALYSIS
    .replace('{url}', pageContext.url)
    .replace('{title}', pageContext.title)
    .replace('{domain}', pageContext.domain)
    .replace('{detectedLanguage}', pageContext.detectedLanguage)
    .replace('{fields}', JSON.stringify(pageContext.fields, null, 2))
    .replace('{siteContent}', JSON.stringify(pageContext.siteContent, null, 2));
    
  return await callAI(prompt);
}

export async function generateFormResponses(
  profile: Profile, 
  siteAnalysis: SiteAnalysis, 
  fields: FormField[]
): Promise<Record<string, string>> {
  const prompt = PROMPTS.CONTEXTUAL_FILL
    .replace('{siteType}', siteAnalysis.siteType)
    .replace('{targetLanguage}', siteAnalysis.targetLanguage)
    .replace('{formPurpose}', siteAnalysis.formPurpose)
    .replace('{expectedTone}', siteAnalysis.expectedTone)
    .replace('{culturalContext}', siteAnalysis.culturalContext)
    .replace('{profileData}', JSON.stringify(profile.aiStructure, null, 2))
    .replace('{formFields}', JSON.stringify(fields, null, 2))
    .replace('{dateFormat}', siteAnalysis.fillStrategy.languageAdaptations.dateFormat)
    .replace('{phoneFormat}', siteAnalysis.fillStrategy.languageAdaptations.phoneFormat)
    .replace('{addressFormat}', siteAnalysis.fillStrategy.languageAdaptations.addressFormat);

  return await callAI(prompt, 0.8); // Slightly higher temperature for creative responses
}

export { detectLanguage }; 