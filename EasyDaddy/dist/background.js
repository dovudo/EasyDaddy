import { f as browserAPI, b as getActiveProfileId, c as getProfile, d as saveProfile } from "./assets/browser-compat-52inOtKV.js";
import { m as makeBus } from "./assets/index-CJ6fAO0g.js";
const CONFIG = {
  // ID модели (например, deepseek/deepseek-r1-0528, openai/gpt-4o, anthropic/claude-3-haiku и т.д.)
  model: "google/gemini-2.5-flash-lite-preview-06-17",
  // Базовый URL API (по умолчанию OpenRouter)
  baseUrl: "https://openrouter.ai/api/v1",
  // API ключ (OpenRouter или OpenAI)
  apiKey: "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",
  // Для рейтинга на openrouter (опционально)
  siteUrl: "https://easydaddy.extension",
  siteName: "EasyDaddy Extension",
  // Поддержка structured JSON (можно вынести в env при необходимости)
  supportsJsonMode: true,
  // Параметры генерации
  temperature: Number(void 0) || 0.7,
  maxTokens: Number(void 0) || 4096
};
console.log("[LLM CONFIG] apiKey:", CONFIG.apiKey);
console.log("[LLM CONFIG] baseUrl:", CONFIG.baseUrl);
console.log("[LLM CONFIG] model:", CONFIG.model);
const buildModelConfig = () => {
  return {
    apiKey: CONFIG.apiKey,
    baseUrl: CONFIG.baseUrl,
    model: CONFIG.model,
    siteUrl: CONFIG.siteUrl,
    siteName: CONFIG.siteName,
    supportsJsonMode: CONFIG.supportsJsonMode,
    maxTokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature,
    headers: {
      ...{ "HTTP-Referer": CONFIG.siteUrl },
      ...{ "X-Title": CONFIG.siteName }
    }
  };
};
console.log("BG SCRIPT VERSION: 1");
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
console.log(`EasyDaddy background script loaded. Using model: ${CONFIG.model}`);
console.log(`API base: ${CONFIG.baseUrl} | JSON mode: ${CONFIG.supportsJsonMode} | Temp: ${CONFIG.temperature} | Max tokens: ${CONFIG.maxTokens}`);
async function chat(systemPrompt, userContent, modelName) {
  const config = buildModelConfig();
  const apiUrl = config.baseUrl + "/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${config.apiKey}`
  };
  if (config.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = CONFIG.siteUrl;
    headers["X-Title"] = CONFIG.siteName;
  }
  const requestBody = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent }
    ],
    temperature: config.temperature,
    max_tokens: config.maxTokens
  };
  {
    requestBody.response_format = { type: "json_object" };
  }
  {
    console.log("Chat request:", { model: config.model, headers, requestBody });
  }
  const response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }
  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (parseError) {
    console.warn("Failed to parse JSON response, returning raw content:", data.choices[0].message.content);
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
}
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[EasyDaddy] Message received in background (${browserAPI.name}):`, message);
  if (message.type === "extract_profile") {
    (async () => {
      try {
        const structuredData = await chat(EXTRACT_PROFILE_PROMPT, message.text);
        console.log("[AI AUTOFILL RAW RESPONSE] extract_profile:", structuredData);
        sendResponse(structuredData);
      } catch (error) {
        console.error("Error during profile extraction:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
  if (message.type === "autofill") {
    (async () => {
      const { context, profile } = message;
      const allowedSelectors = (context.fields || []).map((f) => f.selector).filter(Boolean);
      const allowedSelectorsStr = allowedSelectors.length > 0 ? allowedSelectors.map((s) => `  "${s}"`).join(",\n") : "";
      const strictAutofillPrompt = `You are FormAutoFiller_v3, an expert at web form autofill using structured user profiles.

IMPORTANT: You MUST use ONLY the following selectors as keys for your output:
[
${allowedSelectorsStr}
]
Do NOT add any other keys except the selectors listed above. If you do not have appropriate data for a selector, simply omit it from the response.

You will receive:
1. PAGE_CONTEXT: contains URL, title, and an array of form fields with descriptions
2. USER_PROFILE: a structured user profile
3. INSTRUCTIONS: optional user hints that override the profile for this session

- Your task:
  - For each form field, analyze its description and find the most appropriate data in USER_PROFILE
  - Return ONLY a JSON object where keys are selectors from the list above and values are the appropriate data
  - Do NOT add any other keys
  - If there is no suitable data, do not include the selector in the response
  - If INSTRUCTIONS contradict the profile, follow INSTRUCTIONS

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
        INSTRUCTIONS: message.instructions || ""
      };
      try {
        const userContentString = JSON.stringify(promptContext, null, 2);
        const fillData = await chat(strictAutofillPrompt, userContentString);
        console.log("[AI AUTOFILL RAW RESPONSE] autofill:", fillData);
        sendResponse(fillData);
      } catch (error) {
        console.error("Error during autofill:", error);
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }
});
const backgroundHandlers = {
  form: {
    async analyze(submissionData, { tab }) {
      try {
        console.log("[EasyDaddy Background] Analyzing form submission:", submissionData);
        const activeProfileId = await getActiveProfileId();
        if (!activeProfileId) {
          return { shouldPromptSave: false, message: "No active profile" };
        }
        const currentProfile = await getProfile(activeProfileId) || {};
        const existingSites = currentProfile.sites || [];
        const existingSite = existingSites.find(
          (site) => site.domain === submissionData.domain
        );
        const existingFields = (existingSite == null ? void 0 : existingSite.fields) || {};
        const newFields = {};
        const conflictFields = {};
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
        const response = {
          shouldSave: hasNewData,
          newFields,
          conflictFields,
          data: submissionData
        };
        if (hasNewData) {
          response.shouldPromptSave = true;
          console.log("[EasyDaddy Background] Found new/changed fields:", { newFields, conflictFields });
        }
        return response;
      } catch (error) {
        console.error("[EasyDaddy Background] Error analyzing form:", error);
        return { shouldPromptSave: false, error: error.message };
      }
    },
    async save(submissionData, { tab }) {
      try {
        console.log("[EasyDaddy Background] Saving form data:", submissionData);
        const activeProfileId = await getActiveProfileId();
        if (!activeProfileId) {
          throw new Error("No active profile");
        }
        const currentProfile = await getProfile(activeProfileId) || {};
        const existingSites = currentProfile.sites || [];
        let siteData = existingSites.find(
          (site) => site.domain === submissionData.domain
        );
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
        siteData.fields = {
          ...siteData.fields,
          ...submissionData.fields
        };
        siteData.lastUsed = submissionData.timestamp;
        siteData.useCount = (siteData.useCount || 0) + 1;
        const updatedProfile = {
          ...currentProfile,
          sites: existingSites
        };
        await saveProfile(activeProfileId, updatedProfile);
        console.log("[EasyDaddy Background] Form data saved successfully");
        return { success: true, profileId: activeProfileId };
      } catch (error) {
        console.error("[EasyDaddy Background] Error saving form data:", error);
        throw error;
      }
    }
  },
  // Test handler
  ping() {
    return { status: "background alive", timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  }
};
makeBus("background", {
  handlers: backgroundHandlers,
  external: true
  // Allow external connections if needed
});
console.log("[EasyDaddy Background] Extension Bus initialized");
