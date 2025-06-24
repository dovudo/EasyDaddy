// BG SCRIPT VERSION: 1
console.log('BG SCRIPT VERSION: 1');
// EasyDaddy Extension - Background Script
// 
// LLM Integration via OpenRouter API with configurable models
// 
// Configuration is now managed in src/lib/llm-config.ts
// To switch models: Update CONFIG.activeModel in llm-config.ts
// To add new models: Add them to MODELS in llm-config.ts
//
// Environment Variables Required:
// - VITE_OPENROUTER_API_KEY: Your OpenRouter API key (preferred)
// - VITE_OPENAI_API_KEY: For direct OpenAI API calls

import { 
  LLMConfig,
  CONFIG,
  buildModelConfig
} from './lib/llm-config.js';

// Comprehensive, extensible profile schema
const PROFILE_SCHEMA = {
  "personal": {
    "firstName": "...",
    "lastName": "...",
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "dateOfBirth": "...",
    "nationality": "...",
    "address": {
      "street": "...",
      "city": "...",
      "state": "...",
      "zipCode": "...",
      "country": "..."
    },
    "summary": "...",
    "bio": "..."
  },
  "professional": {
    "currentTitle": "...",
    "experience": [
      {
        "company": "...",
        "position": "...",
        "startDate": "...",
        "endDate": "...",
        "description": "...",
        "technologies": ["..."],
        "achievements": ["..."]
      }
    ],
    "skills": {
      "technical": ["..."],
      "soft": ["..."],
      "languages": ["..."],
      "frameworks": ["..."],
      "tools": ["..."]
    },
    "salaryExpectation": "...",
    "availabilityDate": "..."
  },
  "education": [
    {
      "institution": "...",
      "degree": "...",
      "field": "...",
      "startYear": "...",
      "endYear": "...",
      "gpa": "...",
      "honors": "...",
      "thesis": "..."
    }
  ],
  "projects": [
    {
      "name": "...",
      "description": "...",
      "role": "...",
      "technologies": ["..."],
      "duration": "...",
      "outcome": "...",
      "url": "..."
    }
  ],
  "research": {
    "publications": [
      {
        "title": "...",
        "authors": ["..."],
        "journal": "...",
        "year": "...",
        "doi": "..."
      }
    ],
    "patents": ["..."],
    "conferences": ["..."],
    "grants": ["..."]
  },
  "additional": {
    "certifications": [
      {
        "name": "...",
        "issuer": "...",
        "date": "...",
        "expiryDate": "..."
      }
    ],
    "languages": [
      {
        "language": "...",
        "level": "..."
      }
    ],
    "hobbies": ["..."],
    "volunteering": ["..."],
    "awards": ["..."]
  },
  "documents": {
    "portfolio": "...",
    "linkedin": "...",
    "github": "...",
    "website": "...",
    "resume": "...",
    "coverLetter": "..."
  }
};

const EXTRACT_PROFILE_PROMPT = `You are DataExtractor_v2, an expert at extracting structured information from various types of documents.

You will receive raw text from documents such as:
- Resumes/CVs
- Project descriptions  
- Research papers
- Personal profiles
- Cover letters
- Academic transcripts
- Portfolio descriptions

Your task: Extract relevant information and organize it according to the provided schema. 

IMPORTANT RULES:
1. Only include information that is explicitly stated or clearly implied in the text
2. Use "..." for any fields where no information is available
3. For arrays, include all relevant items found in the text
4. For dates, use consistent formats (YYYY-MM-DD or YYYY)
5. Be precise and avoid making assumptions

SCHEMA:
${JSON.stringify(PROFILE_SCHEMA, null, 2)}

Return ONLY a valid JSON object following this exact schema structure. Do not include any explanations or additional text.

RAW TEXT:
---
`;

const AUTOFILL_PROMPT = `You are FormAutoFiller_v2, an expert at understanding web forms and filling them intelligently using comprehensive user profiles.

You will receive:
1. PAGE_CONTEXT: Contains URL, title, and an array of form fields with rich descriptions
2. USER_PROFILE: A comprehensive profile with categorized information

Your task:
1. Analyze each field's description to understand what type of information it needs
2. Navigate the appropriate section(s) of USER_PROFILE to find matching data
3. Return ONLY a valid JSON object with CSS selectors as keys and appropriate values

FIELD TYPE HANDLING:

**TEXT INPUTS** (Type: text, email, tel, etc.):
- Return the actual text value to fill in

**DROPDOWNS** (Type: select):
- Look for "Available options: [...]" in the description
- Return the EXACT option text that best matches the user's data
- If no exact match, choose the closest option from the available list
- Common mappings: "Bachelor's Degree", "Master's Degree", "Yes", "No", etc.

**CHECKBOXES** (Type: checkbox):
- Return "true" to check the box, "false" to uncheck
- Base decision on user data relevance (e.g., "Do you have experience with Java?" → "true" if Java is in skills)

**RADIO BUTTONS** (Type: radio button):
- Return "true" for the option that should be selected
- Only one radio button in a group should get "true", others get "false" or are omitted
- Look for "Radio group options: [...]" in the description

FIELD MATCHING STRATEGY:
- Name fields → personal.firstName, personal.lastName, personal.fullName
- Contact fields → personal.email, personal.phone
- Address fields → personal.address.*
- Current position → professional.currentTitle
- Company → professional.experience[0].company (most recent)
- Skills → professional.skills.* (choose most relevant type)
- Education → education[0].* (most recent/relevant)
- Experience → professional.experience[*] (choose most relevant)
- Authorization/Legal questions → Use common sense: usually "Yes" for work authorization
- Referral questions → Usually "No" unless explicitly mentioned in profile

IMPORTANT GUIDELINES:
- For dropdowns: MUST use exact text from available options
- For yes/no questions: Return "Yes" or "No" (exact case from options)
- For experience levels: Match to actual experience (Junior, Mid-level, Senior)
- For education dropdowns: Use full degree names ("Bachelor of Science", not "BS")
- Skip fields if no appropriate data exists
- For required fields, try harder to find appropriate data

Example response:
{
  "input[name='firstName']": "Alexander",
  "input[name='email']": "dovjobs@gmail.com",
  "select[name='experience-level']": "Senior",
  "input[type='checkbox'][name='java-experience']": "true",
  "input[type='radio'][name='authorization'][value='yes']": "true"
}

Return ONLY the JSON object, no additional text.`;

// Log startup information
console.log(`EasyDaddy background script loaded. Using model: ${CONFIG.model}`);
console.log(`API base: ${CONFIG.baseUrl} | JSON mode: ${CONFIG.supportsJsonMode} | Temp: ${CONFIG.temperature} | Max tokens: ${CONFIG.maxTokens}`);

async function chat(systemPrompt: string, userContent: string, modelName?: string): Promise<any> {
  const config = buildModelConfig();
  const apiUrl = config.baseUrl + '/chat/completions';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // Add OpenRouter-specific headers if using OpenRouter
  if (config.baseUrl.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = CONFIG.siteUrl;
    headers['X-Title'] = CONFIG.siteName;
  }

  const requestBody: any = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  // Add response_format for JSON mode if supported
  if (config.supportsJsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  if (CONFIG.debug) {
    console.log('Chat request:', { model: config.model, headers, requestBody });
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    console.warn('Failed to parse JSON response, returning raw content:', data.choices[0].message.content);
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);

  if (message.type === 'extract_profile') {
    (async () => {
      try {
        const structuredData = await chat(EXTRACT_PROFILE_PROMPT, message.text);
        console.log('[AI AUTOFILL RAW RESPONSE] extract_profile:', structuredData);
        sendResponse(structuredData);
      } catch (error) {
        console.error('Error during profile extraction:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Indicates async response
  }
  if (message.type === 'autofill') {
    (async () => {
      const { context, profile } = message;
      const allowedSelectors = (context.fields || [])
        .map((f: any) => f.selector)
        .filter(Boolean);
      const allowedSelectorsStr = allowedSelectors.length > 0
        ? allowedSelectors.map(s => `  "${s}"`).join(',\n')
        : '';
      const strictAutofillPrompt = `You are FormAutoFiller_v3, an expert at web form autofill using structured user profiles.

IMPORTANT: You MUST use ONLY the following selectors as keys for your output:
[
${allowedSelectorsStr}
]
Do NOT add any other keys except the selectors listed above. If you do not have appropriate data for a selector, simply omit it from the response.

You will receive:
1. PAGE_CONTEXT: contains URL, title, and an array of form fields with descriptions
2. USER_PROFILE: a structured user profile

Your task:
- For each form field, analyze its description and find the most appropriate data in USER_PROFILE
- Return ONLY a JSON object where keys are selectors from the list above and values are the appropriate data
- Do NOT add any other keys
- If there is no suitable data, do not include the selector in the response

Example response:
{
  "input[name='firstName']": "Alexander",
  "input[name='email']": "dovjobs@gmail.com",
  "select[name='experience-level']": "Senior"
}

PAGE_CONTEXT and USER_PROFILE:
`;
      const promptContext = {
        PAGE_CONTEXT: context,
        USER_PROFILE: profile,
      };
      try {
        const userContentString = JSON.stringify(promptContext, null, 2);
        const fillData = await chat(strictAutofillPrompt, userContentString);
        console.log('[AI AUTOFILL RAW RESPONSE] autofill:', fillData);
        sendResponse(fillData);
      } catch (error) {
        console.error('Error during autofill:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Indicates async response
  }
});
