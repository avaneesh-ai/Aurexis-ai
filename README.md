# 🌍 GoPlanet AI Chatbot

A full-featured mobile AI chatbot platform powered by Groq API, built with React + Vite.

---

## 📁 Project Structure

```
goplanet-live/
├── index.html                   ← App entry (mobile viewport)
├── package.json                 ← Dependencies
├── vite.config.js               ← Vite + PWA config
├── netlify.toml                 ← Netlify deployment config
├── vercel.json                  ← Vercel deployment config
├── .env.example                 ← Environment variables template
├── .gitignore
│
├── src/
│   ├── main.jsx                 ← React root
│   ├── index.css                ← Global styles
│   └── GoPlanetApp.jsx          ← Full app (all screens & logic)
│
├── public/
│   ├── manifest.json            ← PWA manifest
│   ├── favicon.svg              ← App icon (SVG)
│   ├── robots.txt               ← SEO
│   ├── _redirects               ← Netlify SPA routing
│   └── icons/                   ← PWA icons (add your PNG icons here)
│       ├── icon-192.png         ← Add your logo as 192×192 PNG
│       └── icon-512.png         ← Add your logo as 512×512 PNG
│
├── server/
│   └── index.js                 ← Express backend (email, users, API)
│
└── netlify/
    └── functions/
        └── goplanet-api.js      ← Serverless function (Netlify)
```

---

## 🚀 Quick Start (Local Development)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run the frontend
```bash
npm run dev
# Opens at http://localhost:3000
```

### 4. Run the backend (optional — for real email sending)
```bash
node server/index.js
# Runs at http://localhost:4000
```

---

## 🌐 Deploying to Production

### Option A — Vercel (Recommended, Free)

1. Push code to GitHub
2. Go to https://vercel.com → New Project → Import repo
3. Framework: **Vite**
4. Add environment variables in Vercel dashboard
5. Click Deploy

```bash
# Or deploy via CLI
npm install -g vercel
vercel --prod
```

### Option B — Netlify (Free)

1. Push code to GitHub
2. Go to https://netlify.com → New Site → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify dashboard
6. Deploy

```bash
# Or deploy via CLI
npm install -g netlify-cli
netlify deploy --prod
```

### Option C — Self-hosted VPS (DigitalOcean, AWS, etc.)

```bash
# Build
npm run build

# Serve with nginx — point root to /dist
# Or use serve:
npm install -g serve
serve -s dist -l 3000

# Run backend
node server/index.js
```

---

## 🔑 Setting Up Services

### Groq API (AI Chat)
1. Sign up at https://console.groq.com (free)
2. Create an API key
3. Users enter their own key in **Settings → API Configuration**
4. Or set `VITE_GROQ_API_KEY` in `.env` as a default

### Gmail Email (Verification)
1. Use a Gmail account
2. Enable 2FA at https://myaccount.google.com/security
3. Create an App Password: Google Account → Security → App Passwords
4. Set `EMAIL_USER` and `EMAIL_PASS` in `.env`

### Stripe (Real Payments) — Optional
1. Sign up at https://stripe.com
2. Create a product: $25/year recurring
3. Copy your Price ID and API keys to `.env`
4. Set up webhook pointing to `/api/stripe-webhook`

### Supabase (Database) — Recommended for Production
1. Sign up at https://supabase.com (free tier available)
2. Create a new project
3. Copy URL and anon key to `.env`
4. Run this SQL to create your users table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  mobile TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verify_token TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_pro BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  exam_score INTEGER,
  cert_date TEXT,
  cert_granted BOOLEAN DEFAULT FALSE
);
```

---

## 📱 Making It a Mobile App (PWA)

GoPlanet is already PWA-ready. Users can install it:

**On Android (Chrome):**
- Visit the site → tap menu → "Add to Home Screen"

**On iOS (Safari):**
- Visit the site → tap Share → "Add to Home Screen"

**For full native app (optional):**
```bash
# Using Capacitor to wrap as native Android/iOS app
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init GoPlanet com.goplanet.app
npm run build
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # Opens in Android Studio
npx cap open ios       # Opens in Xcode
```

---

## ⚙️ App Features

| Feature | Details |
|---|---|
| 🔐 Auth | Email + password registration with email verification |
| 💾 Persistence | Auto-login via localStorage session |
| 💬 AI Chat | Groq API (Llama 3.3, Mixtral, Gemma 2) or Code Mode |
| 📁 Projects | Create and manage AI project workspaces |
| 🎨 Image Gen | AI image generation with prompt |
| ⭐ Subscriptions | Free / Pro ($25/year) with payment flow |
| 🛡️ Admin Panel | View all members, grant Pro/Admin access |
| 📝 Exam | 50 MCQ certification exam |
| 🏆 Certificate | Auto-generated with name + date, downloadable PNG |
| 📖 Guide | Built-in user guide in Settings |
| 🌙 Dark Mode | Toggle in Settings |
| 📱 Mobile-first | Fits any screen, no zoom needed |
| 🔧 PWA | Installable as mobile app |

---

## 🛡️ Admin Access

- The **first registered user** is automatically an Admin
- Admins see an extra "Admin" tab in the bottom nav
- Admins can: view all members, grant Pro or Admin access to any user
- To make someone admin via server: `PATCH /api/users/:id` with `{ "isAdmin": true }`

---

## 📜 Certification Exam

- 50 multiple-choice questions on AI and GoPlanet topics
- Score **40 or more out of 50** to earn the certificate
- Certificate is dynamically generated on an HTML canvas with:
  - User's registered name
  - Exam date
  - GoPlanet branding
- Downloadable as PNG
- Retake anytime from Settings

---

## 🔧 Customisation

| What | Where |
|---|---|
| App name / branding | `src/GoPlanetApp.jsx` → S.logo section |
| Quiz questions | `QUIZ_QUESTIONS` array in `GoPlanetApp.jsx` |
| Guide content | `GUIDE_SECTIONS` array in `GoPlanetApp.jsx` |
| AI models | `GROQ_MODELS` array in `GoPlanetApp.jsx` |
| Subscription price | `SubscriptionTab` component |
| Colors | `#6c5ce7` (purple) throughout the file |
| PWA icons | Replace files in `/public/icons/` |

---

## 📄 License

© 2025 GoPlanet. All rights reserved.
