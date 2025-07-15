# ⚡ EasyDaddy Quick Start

## 🚀 5 Minutes to Launch

### 1. Get Your API Key
- Go to https://openrouter.ai/
- Register and create an API key
- Copy the key (it starts with `sk-or-v1-`)

### 2. Set Up .env.local
```bash
cp env.example .env.local
```

Edit `.env.local`:
```bash
VITE_OPENROUTER_API_KEY=sk-or-v1-your-key-here
VITE_MODEL=openai/gpt-4o-mini
```

### 3. Build the Extension
```bash
npm install
npm run build
```

### 4. Install in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `dist/` folder

### 5. Create a Profile
1. Click the EasyDaddy icon
2. Create a profile with your data
3. Done!

## 🖱️ Usage

### Main Method:
1. Open any page with a form
2. **Right-click** anywhere
3. Select **"EasyDaddy - Fill Forms"**
4. Forms will be filled automatically! 🎉

### Alternatives:
- `Alt+Shift+F` - Fill forms
- `Alt+Shift+E` - Open settings

## 🧪 Testing
Open `public/test-context-menu.html` and try the context menu!

## 🚨 Problems?
- No API key? → Check `.env.local`
- No context menu? → Reload the extension
- Forms not filling? → Check the console (F12)

📖 **Detailed guide:** `SETUP_GUIDE.md` 