const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function chat(messages: any[]) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.2,
    }),
  });
  const json = await res.json();
  return json.choices[0].message.content;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'extract_profile') {
    (async () => {
      const prompt = [
        {
          role: 'system',
          content:
            'You are FormDataExtractor.\nReturn JSON only with the schema provided.',
        },
        { role: 'user', content: `RAW_TEXT:\n${msg.text}` },
      ];
      const out = await chat(prompt);
      try {
        sendResponse(JSON.parse(out));
      } catch {
        sendResponse({});
      }
    })();
    return true;
  }
  if (msg.type === 'autofill') {
    (async () => {
      const prompt = [
        { role: 'system', content: 'You are FormAutoFiller v1.' },
        {
          role: 'user',
          content: `Given PAGE_CONTEXT and USER_PROFILE return JSON where each key is a CSS selector found in PAGE_CONTEXT.fields and each value is the string we should type. Think step-by-step but output ONLY JSON.\n===\nPAGE_CONTEXT:\n${JSON.stringify(
            msg.context,
            null,
            2
          )}\n===\nUSER_PROFILE:\n${JSON.stringify(msg.profile, null, 2)}`,
        },
      ];
      const out = await chat(prompt);
      try {
        sendResponse(JSON.parse(out));
      } catch {
        sendResponse({});
      }
    })();
    return true;
  }
});
