# ELI5 — Explain Like I'm 5

A Chrome extension that simplifies complex text using AI.

Select text or snip an area on the screen, then get concise explanations in your preferred persona and format.

## Features

- Text selection explain flow (`Elify` button near selected text)
- Snip mode (`Ctrl+Shift+S` / `Cmd+Shift+S`) for screenshot-based explanations
- Personas: Teacher, Friendly, Professional, Gen Z, plus custom personas
- Output formats: Bullets, Paragraph, Simple
- Refinement actions: **Simplify More** / **Explain More**
- Copy to clipboard, draggable popup, resizable popup

## Project Structure

```text
ELI5/
├── manifest.json
├── background.js
├── contentScript.js
├── local.ai.config.example.js
├── popup/
│   ├── popup.html
│   └── popup.js
├── options/
│   ├── options.html
│   └── options.js
└── assets/
    └── eli5-nobg.png
```

## How It Works

1. Content script shows `Elify` when text is selected.
2. Clicking it opens the popup and sends a request to the background service worker.
3. Background builds the persona + format-aware prompt.
4. AI response is returned and rendered in the popup.
5. Snip mode captures a selected screen area and explains detected text.

## AI Setup (Two Options)

You can run ELI5 in either mode:

### Option A (Recommended): Backend Mode

Use a FastAPI backend to keep API keys outside extension code.

In `background.js`:

```js
const AI_MODE = "backend";
const API_ENDPOINT = "https://your-backend.example.com";
```

Backend should expose:

- `POST /api/explain` receiving `messages`, `temperature`, `max_tokens`, `model`
- returns `{ success: true, explanation }` on success

### Option B (Local Only): Direct API in Same Folder

Use this only for personal/local usage.

1. Copy `local.ai.config.example.js` to `local.ai.config.js`
2. Add your key in `local.ai.config.js`
3. Switch mode in `background.js`:

```js
const AI_MODE = "local";
```

`local.ai.config.js` format:

```js
self.ELI5_LOCAL_CONFIG = {
  provider: "openai",
  openaiApiKey: "sk-your-openai-api-key-here",
  model: "gpt-4o-mini",
};
```

`local.ai.config.js` is gitignored by default, so your key stays out of commits.

## Load Extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `ELI5` folder

## Keyboard Shortcut

- `Ctrl+Shift+S` (`Cmd+Shift+S` on Mac): Start Snip Mode
- Customize at `chrome://extensions/shortcuts`

## Important Notes

- **Backend mode** is safer and recommended for sharing/publishing.
- **Local mode** is convenient for personal local use.
- Persona/format settings are saved in `chrome.storage.sync`.

## License

MIT
