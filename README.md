# EasyDaddy – Smart Autofill Chrome Extension

> ⚡ Save hours on repetitive form-filling. EasyDaddy uses LLMs to understand the web page you're on and fills out the right information from your personal or project profiles – even complex answers like motivation letters or pitch descriptions.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Multiple Profiles** | Switch between Personal, Startup, Freelance CV, etc. |
| **Intelligent Autofill** | ChatGPT analyses page context & maps your data to each field. |
| **File Import** | Drop `.txt`, `.pdf`, `.md` with your CV / project brief – EasyDaddy extracts structured data automatically. |
| **Local-first Storage** | All profiles are kept in your browser's IndexedDB (AES-GCM encrypted). |
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

## 📄 License

This project is licensed under the **Business Source License 1.1 (BUSL-1.1)**.

- **Non-commercial use only:** You may use, modify, and distribute this code for non-commercial purposes.
- **Commercial use:** For commercial use (including SaaS, paid products, or integration into commercial offerings), a separate commercial license is required. Please contact **dovjobs@gmail.com** to discuss licensing options.
- **Change Date:** On 2027-06-01, this project will automatically be relicensed under the Apache License 2.0.

See the [LICENSE](./LICENSE) file for full terms.

## 🌐 Supported Browsers & Compatibility Goals

EasyDaddy is designed for **maximum cross-browser compatibility**. The extension aims to work seamlessly in:

- **Google Chrome** (latest and LTS)
- **Arc Browser**
- **Microsoft Edge** (Chromium-based)
- **Mozilla Firefox** (WebExtensions API)
- **Opera** (Chromium-based)
- **Apple Safari** (Safari 11+, via WebExtensions API)

**Safari Support:**
- Targeting Safari 11 and above (macOS High Sierra+)
- Uses WebExtensions API for unified codebase
- Special attention to Manifest V3 and Safari-specific limitations
- Regular testing in Safari Technology Preview

> **Goal:** Deliver a single extension codebase that works across all major browsers, including Safari, with minimal browser-specific code and maximum maintainability.

## 🍏 Safari Support & Known Issues

### Установка в Safari

1. Откройте Xcode (или Safari Extension Converter)
2. Импортируйте папку расширения как WebExtension Project
3. Соберите и установите расширение в Safari (следуйте инструкциям Xcode)
4. Включите расширение в настройках Safari (Preferences → Extensions)

### Известные ограничения Safari

- Не все Chrome/Firefox API поддерживаются (особенно chrome.scripting, chrome.action)
- CSP может блокировать некоторые динамические скрипты (eval, dynamic import)
- Ограничения на работу background/service worker
- Возможны отличия в работе storage и messaging
- Нет поддержки некоторых экспериментальных API
- Возможны проблемы с PDF-парсингом (pdfjs-dist)

> Если расширение не работает в Safari, проверьте консоль на ошибки и убедитесь, что все разрешения указаны в manifest.json.

```
MIT © 2025 YOUR_NAME_OR_COMPANY
```
