const OPENAI_MODEL = "gpt-4o-mini";
// Vite replaces `import.meta.env.VITE_OPENAI_API_KEY` with the actual key at build time.
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const API_URL = "https://api.openai.com/v1/chat/completions";

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
2. USER_PROFILE: A comprehensive profile with categorized information:
   - personal: Basic personal info, contact details, address
   - professional: Work experience, skills, current role, salary expectations
   - education: Academic background, degrees, institutions
   - projects: Personal/professional projects and their details
   - research: Publications, patents, academic work
   - additional: Certifications, languages, hobbies, awards
   - documents: Links to portfolios, social profiles, etc.

Your task:
1. Analyze each field's description to understand what type of information it needs
2. Navigate the appropriate section(s) of USER_PROFILE to find matching data
3. Return ONLY a valid JSON object with CSS selectors as keys and appropriate values

FIELD MATCHING STRATEGY:
- Name fields → personal.firstName, personal.lastName, personal.fullName
- Contact fields → personal.email, personal.phone
- Address fields → personal.address.*
- Current position → professional.currentTitle
- Company → professional.experience[0].company (most recent)
- Skills → professional.skills.* (choose most relevant type)
- Education → education[0].* (most recent/relevant)
- Experience → professional.experience[*] (choose most relevant)
- Projects → projects[*] (choose most relevant)
- Portfolio/Social → documents.*
- Salary → professional.salaryExpectation
- Availability → professional.availabilityDate

IMPORTANT GUIDELINES:
- Prioritize exact matches over approximate ones
- For experience fields, use the most recent or most relevant entry
- For dropdown/select fields, return simple, common values (e.g., "Yes", "No", "Bachelor's", "Master's")
- Skip fields if no appropriate data exists rather than guessing
- Use full names, not abbreviations (e.g., "Bachelor of Science" not "BS")
- For required fields, try harder to find appropriate data

Example response:
{
  "input[name='firstName']": "Alexander",
  "input[name='email']": "dovjobs@gmail.com",
  "#current-position": "Backend Developer",
  "select[name='education-level']": "Bachelor's Degree"
}

Return ONLY the JSON object, no additional text.`;

console.log('EasyDaddy background script loaded.');

async function chat(systemPrompt: string, userContent: string): Promise<any> {
  if (!OPENAI_KEY) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API request failed: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch (e) {
    throw new Error("Failed to parse JSON response from OpenAI.");
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
