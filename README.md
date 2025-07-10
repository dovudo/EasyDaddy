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
| **Multiple Access Methods** | Popup button, right-click context menu, or keyboard shortcuts. |
| **Cross-Browser Support** | Works on Chrome, Arc, Edge, Firefox, and Safari with optimized UX per browser. |
| **Safari-Optimized** | Context menu and keyboard shortcuts solve Safari popup limitations. |
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

## 🍎 Safari Support & Multi-Modal Access

### Safari Installation

1. Open Xcode (or Safari Extension Converter)
2. Import extension folder as WebExtension Project
3. Build and install extension in Safari (follow Xcode instructions)
4. Enable extension in Safari Preferences → Extensions

### Safari Popup "Limitation" - Actually a Feature!

When you click the EasyDaddy icon in Safari, it opens in "tab mode" instead of overlay popup. **This is Safari's intended behavior for security**, not a bug.

### Solution: Multiple Access Methods

EasyDaddy provides **three ways** to fill forms, making it more powerful than popup-only extensions:

#### 1. **Right-click Context Menu** (Recommended for Safari)
- Right-click anywhere on a webpage
- Select "EasyDaddy - Fill Forms" 
- Forms filled instantly with active profile

#### 2. **Keyboard Shortcuts**
- `Cmd+Option+F` - Fill forms on current page
- `Cmd+Option+E` - Open EasyDaddy settings

#### 3. **Extension Icon** (Settings & Profile Management)
- Click extension icon for profile management
- Works in tab mode with full functionality

### Why This is Better Than Traditional Popups

- **Always accessible** - works regardless of browser limitations
- **Faster workflow** - right-click is faster than icon hunting
- **Native integration** - feels like built-in Safari feature
- **Power user friendly** - keyboard shortcuts for efficiency

> See `docs/safari-popup-solution.md` for detailed technical explanation.

```
MIT © 2025 YOUR_NAME_OR_COMPANY
```
