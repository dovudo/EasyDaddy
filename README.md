# EasyDaddy – Smart Autofill Chrome Extension

> ⚡ Save hours on repetitive form-filling. EasyDaddy uses LLMs to understand the web page you’re on and fills out the right information from your personal or project profiles – even complex answers like motivation letters or pitch descriptions.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Multiple Profiles** | Switch between Personal, Startup, Freelance CV, etc. |
| **Intelligent Autofill** | ChatGPT analyses page context & maps your data to each field. |
| **File Import** | Drop `.txt`, `.pdf`, `.md` with your CV / project brief – EasyDaddy extracts structured data automatically. |
| **Local-first Storage** | All profiles are kept in your browser’s IndexedDB (AES-GCM encrypted). |
| **One-click "Fill Out"** | Hit the button in the popup – forms are scanned and populated instantly. |
| **Highlight & Edit** | Newly filled fields flash yellow for 1 s so you can review / tweak. |

---

## 🏗 Tech Stack

* **Browser** – Chromium (Manifest v3)
* **Frontend** – TypeScript, React, Tailwind, Vite
* **Storage** – [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB wrapper)
* **AI Engine** – OpenAI GPT-4o (or any chat-completion API)
* **Build/Dev** – PNPM + ESLint + Prettier

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
pnpm install # or npm install / yarn
```

### 2. Set Environment Variables

Create `.env.local` in the project root:

```bash
VITE_OPENAI_API_KEY="sk-••••••••••••"
VITE_OPENAI_MODEL="gpt-4o-mini"
```

### 3. Run Dev Build

```bash
pnpm dev  # opens Vite in watch mode & builds into /dist
```

### 4. Load Unpacked Extension

1. Open `chrome://extensions`  
2. Enable **Developer mode**  
3. Click **Load unpacked** → select the `dist/` folder

> 🔁 Every time you re-run `pnpm dev` just hit **Reload** on the extension card.

---

## 📂 Project Structure

```
├── dist/              # Production bundle (output)
├── public/            # Icons, manifest.json template
├── src/
│   ├── content/       # content.ts – DOM scanner & fill logic
│   ├── popup/         # React popup UI (profiles, editor, Fill Out btn)
│   ├── background.ts  # Message router, OpenAI calls
│   ├── lib/
│   │   ├── storage.ts # IndexedDB helpers (idb-keyval)
│   │   └── openai.ts  # fetch wrapper + prompts
│   └── types/
│       └── schemas.ts # Zod schemas for profile & AI output
└── vite.config.ts
```

---

## 🔑 OpenAI Integration

* **Analysis Prompt** – extracts structured data from raw text / PDFs
* **Autofill Prompt** – returns JSON `{ cssSelector: "value" }`
* All network calls happen in `background.ts` to keep the API key out of the page context.

> The API key is _never_ injected into content scripts.

---

## 🔐 Privacy & Security

* Profiles encrypted at rest with AES-GCM (WebCrypto).
* EasyDaddy requests the minimal host permissions (`<all_urls>` only for autofill).
* Inline‐scripts & `eval` are blocked to comply with Chrome Store policies.

---

## 🛣 Roadmap

| Version | Planned Features |
|---------|------------------|
| **0.1 MVP** | Multiple profiles, text/PDF import, manual Fill Out. |
| **0.2** | Auto-detect form on page load, hotkey (`⌘/Ctrl ⇧ F`), UX polish. |
| **0.3** | Cloud sync (optional), detailed fill-history log. |
| **0.4** | Safari (macOS) port. |
| **1.0** | iOS Safari extension or custom keyboard. |

---

## 🤝 Contributing

1. Fork the repo & create a feature branch.  
2. Run `pnpm lint --fix && pnpm test`.  
3. Submit a PR with a clear description.

Feel free to open issues for feature requests, bugs, or questions.

---

## 📜 License

```
MIT © 2025 YOUR_NAME_OR_COMPANY
```
