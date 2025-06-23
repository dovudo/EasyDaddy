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
  const config = buildModelConfig(modelName);
  const apiUrl = config.baseUrl + '/chat/completions';
  
  // Build headers for the request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  };

  // Add provider-specific headers
  if (config.headers) {
    Object.assign(headers, config.headers);
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

  // Retry logic
  for (let attempt = 1; attempt <= CONFIG.retries.maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeout);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();
      
      if (CONFIG.debug) {
        console.log('Chat response:', data);
      }

      try {
        return JSON.parse(data.choices[0].message.content);
      } catch (parseError) {
        // If JSON parsing fails, try to return the raw content for manual inspection
        console.warn('Failed to parse JSON response, returning raw content:', data.choices[0].message.content);
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

    } catch (error) {
      console.error(`Chat attempt ${attempt} failed:`, error);
      
      // If this is the last attempt or a non-retryable error, throw
      if (attempt === CONFIG.retries.maxAttempts || error.name === 'AbortError') {
        // Try fallback models if configured and this is the first model attempt
        if (!modelName && CONFIG.fallbackModels.length > 0) {
          console.log('Trying fallback models...');
          for (const fallbackModel of CONFIG.fallbackModels) {
            try {
              console.log(`Attempting fallback model: ${fallbackModel}`);
              return await chat(systemPrompt, userContent, fallbackModel);
            } catch (fallbackError) {
              console.error(`Fallback model ${fallbackModel} failed:`, fallbackError);
            }
          }
        }
        throw error;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, CONFIG.retries.delayMs * attempt));
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);

  if (message.type === 'extract_profile') {
    (async () => {
      try {
        const structuredData = await chat(EXTRACT_PROFILE_PROMPT, message.text);
        sendResponse(structuredData);
      } catch (error) {
        console.error('Error during profile extraction:', error);
        // To see this error in the popup, we need to send it back.
        // A simple way is to send an object with an error property.
        sendResponse({ error: error.message });
      }
    })();
    return true; // Indicates async response
  }
  if (message.type === 'autofill') {
    (async () => {
      const { context, profile } = message;
      const promptContext = {
        PAGE_CONTEXT: context,
        USER_PROFILE: profile,
      };
      try {
        const userContentString = JSON.stringify(promptContext, null, 2);
        const fillData = await chat(AUTOFILL_PROMPT, userContentString);
        sendResponse(fillData);
      } catch (error) {
        console.error('Error during autofill:', error);
        sendResponse({ error: error.message });
      }
    })();
    return true; // Indicates async response
  }
});
