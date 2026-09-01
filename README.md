# PostFlow — Social Media Scheduler

Your personal, free, self-hosted social media scheduler. Upload a video once and automatically post it to **YouTube Shorts**, **Instagram Reels**, and **TikTok** on your schedule.

## ✨ Features

- **Drag & drop video upload** — upload once, post everywhere
- **Schedule posts** in advance with a clean date/time picker
- **Per-platform customization** — different captions for each platform
- **Background scheduler** — posts go live automatically at the scheduled time
- **Calendar view** — see all your scheduled posts at a glance
- **History & analytics** — track what was published and where
- **Dark, beautiful UI** — clean and easy to use

## 🚀 Quick Start

### 1. Clone & Install

```bash
cd social-media-scheduler
npm run setup
```

### 2. Configure API Keys

```bash
cp .env.example .env
# Edit .env with your API credentials (see platform setup below)
```

### 3. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Keep the app running** while posts are scheduled — it posts automatically in the background.

---

## 🔧 Platform Setup

### YouTube Shorts ▶

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project → Enable **"YouTube Data API v3"**
3. Go to **Credentials** → Create **OAuth 2.0 Client ID** (Web Application)
4. Add `http://localhost:3000/api/platforms/youtube/callback` to Authorized Redirect URIs
5. Add to `.env`:
   ```
   YOUTUBE_CLIENT_ID="your_client_id"
   YOUTUBE_CLIENT_SECRET="your_client_secret"
   ```
6. In Settings, click **Connect YouTube Shorts**

**Tips:**
- Videos should be ≤60 seconds and vertical (9:16 aspect ratio) for Shorts
- The app automatically adds `#Shorts` to title and description

---

### Instagram Reels 📸

Requires an **Instagram Business or Creator account** linked to a **Facebook Page**.

1. Go to [developers.facebook.com](https://developers.facebook.com/) → Create App → **Business**
2. Add **Instagram Graph API** product
3. Add `http://localhost:3000/api/platforms/instagram/callback` to redirect URIs
4. Add to `.env`:
   ```
   INSTAGRAM_APP_ID="your_app_id"
   INSTAGRAM_APP_SECRET="your_app_secret"
   ```
5. **Important:** Instagram needs a public URL for videos. For local use, install [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   ```
   Then update your `.env`:
   ```
   NEXT_PUBLIC_APP_URL="https://your-ngrok-url.ngrok.io"
   ```
   Restart the app after changing this.

---

### TikTok ♪

1. Go to [developers.tiktok.com](https://developers.tiktok.com/) → Create App
2. Request **"Content Posting API"** access (TikTok reviews these — may take a few days)
3. Add `http://localhost:3000/api/platforms/tiktok/callback` to redirect URIs
4. Add to `.env`:
   ```
   TIKTOK_CLIENT_KEY="your_client_key"
   TIKTOK_CLIENT_SECRET="your_client_secret"
   ```

---

## 📋 Video Requirements

| Platform | Max Length | Max Size | Format | Aspect Ratio |
|----------|-----------|----------|--------|--------------|
| YouTube Shorts | 60 seconds | 128 GB | MP4, MOV | 9:16 (vertical) |
| Instagram Reels | 90 seconds | 650 MB | MP4, MOV | 9:16 (vertical) |
| TikTok | 10 minutes | 287 MB | MP4, MOV | 9:16 (vertical) |

**Recommended:** 9:16 vertical MP4, ≤60 seconds, ≤500MB for best compatibility across all platforms.

---

## 🗂 Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── page.tsx           # Dashboard
│   ├── schedule/          # Schedule new post
│   ├── queue/             # Upcoming posts
│   ├── calendar/          # Calendar view
│   ├── history/           # Past posts
│   ├── settings/          # Platform connections
│   └── api/               # Backend API routes
├── lib/
│   ├── db.ts              # Prisma database client
│   ├── scheduler.ts       # Background cron scheduler
│   └── platforms/
│       ├── youtube.ts     # YouTube API integration
│       ├── instagram.ts   # Instagram API integration
│       └── tiktok.ts      # TikTok API integration
└── components/            # Shared React components
```

## 🛠 Other Commands

```bash
npm run db:studio   # Open Prisma Studio (visual DB browser)
npm run build       # Build for production
npm run start       # Run production build
```

## ❓ FAQ

**The app needs to be running for posts to go out?**
Yes — this is a local app, so it needs to be running at scheduled post times. Consider leaving it running in a terminal, or run it on a small server/VPS for 24/7 posting.

**Can I run this on a server for 24/7 posting?**
Yes! It's a standard Next.js app. Deploy to any Node.js host (Railway, Render, Fly.io, VPS). For Instagram, you'll need a stable public URL anyway.

**Instagram says the video URL is invalid?**
Make sure `NEXT_PUBLIC_APP_URL` is set to a publicly accessible URL (use ngrok for local testing).

**TikTok API access is taking long?**
TikTok manually reviews Content Posting API applications. It can take days to weeks. You can use the app for YouTube and Instagram in the meantime.
