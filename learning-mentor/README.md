# 📖 Learning Mentor

A Socratic AI learning mentor powered by Claude. Import content from Google Docs, Sheets, Coursera, Udemy, or Excel — and get guided through it with questions, analogies, and discovery.

**Live demo:** `https://sudha-new-github.github.io/learning-mentor/`

---

## 🚀 Deploy to GitHub Pages (step-by-step)

### Step 1 — Create the repo
1. Go to [github.com/new](https://github.com/new)
2. Repository name: `learning-mentor`
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Upload the files
1. In your new repo, click **Add file → Upload files**
2. Upload everything in this folder **including** the hidden `.github` folder
   - On Mac: press `Cmd+Shift+.` to show hidden files in Finder
   - On Windows: check "Show hidden items" in File Explorer
3. Commit with message: `Initial commit`

### Step 3 — Enable GitHub Pages
1. Go to repo **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

### Step 4 — Trigger the deploy
- The deploy runs automatically on every push to `main`
- Go to the **Actions** tab to watch it build (takes ~1 min)
- Your app will be live at: `https://sudha-new-github.github.io/learning-mentor/`

---

## 🔌 Plugin Support (v1)

| Source | How it works |
|---|---|
| **Google Docs** | Paste share URL → exports as plain text |
| **Google Sheets** | Paste share URL → exports as CSV |
| **Coursera** | Paste course URL → scrapes title + description |
| **Udemy** | Paste course URL → scrapes title + description |
| **Excel (.xlsx/.xls)** | Upload file → parsed with SheetJS |
| **CSV** | Upload file → read as text |

> **Note:** Google Docs/Sheets must be set to "Anyone with the link can view"

---

## 🔑 API Key

Users enter their own Anthropic API key via the **Set API Key** button. It's stored in `localStorage` — never sent anywhere except Anthropic's API directly.

Get a key at [console.anthropic.com](https://console.anthropic.com)

---

## 🛠 Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173/learning-mentor/`

---

## 📁 Project Structure

```
learning-mentor/
├── src/
│   ├── App.jsx          # Main app + UI
│   ├── plugins.js       # Import connectors (Google, Coursera, Excel)
│   └── main.jsx         # Entry point
├── public/
│   └── favicon.svg
├── .github/
│   └── workflows/
│       └── deploy.yml   # Auto-deploy to GitHub Pages
├── index.html
├── vite.config.js
└── package.json
```
